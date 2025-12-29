import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { queryCache, videoCache } from '@/lib/query-cache'
import { performanceMonitor } from '@/lib/performance-monitor'

/**
 * Optimized random video selection using random ID approach
 * Avoids expensive COUNT and OFFSET operations on large datasets
 */
async function getRandomVideos(where: any, limit: number): Promise<any[]> {
  const startTime = Date.now()
  
  try {
    // Try TABLESAMPLE first for best performance
    try {
      return await getRandomVideosWithTableSample(where, limit)
    } catch (tableSampleError) {
      console.warn('TABLESAMPLE failed, falling back to alternative method:', tableSampleError)
      
      // Fallback: Use random ID range selection
      const maxId = await prisma.$queryRaw<{ max: number }[]>`
        SELECT MAX(id::bigint) as max FROM videos
      `
      
      const randomStart = Math.floor(Math.random() * (maxId[0]?.max || 100000))
      
      return await prisma.video.findMany({
        where,
        take: limit,
        skip: randomStart,
        orderBy: { id: 'asc' },
        include: { stream: true },
      })
    }
  } finally {
    performanceMonitor.recordQuery('videos:random', Date.now() - startTime, false)
  }
}

/**
 * Get random videos using ID-based selection for better performance
 * This function is now redundant since getRandomVideos handles everything
 */
async function getRandomVideosByViews(where: any, limit: number): Promise<any[]> {
  return await getRandomVideos(where, limit)
}

/**
 * Get random videos using TABLESAMPLE for PostgreSQL
 * This is much faster than ORDER BY RANDOM() for large datasets
 */
async function getRandomVideosWithTableSample(where: any, limit: number): Promise<any[]> {
  const startTime = Date.now()
  
  try {
    // Use TABLESAMPLE to get random sample efficiently
    const randomIds = await prisma.$queryRaw`
      SELECT id FROM videos 
      WHERE views = ${where.views || 0}
      ${where.title ? prisma.$queryRaw`AND title ILIKE ${`%${where.title}%`}` : prisma.$queryRaw``}
      ${where.category ? prisma.$queryRaw`AND category = ${where.category}` : prisma.$queryRaw``}
      ${where.tags ? prisma.$queryRaw`AND tags LIKE ${`%${where.tags}%`}` : prisma.$queryRaw``}
      ${where.performers ? prisma.$queryRaw`AND performers LIKE ${`%${where.performers}%`}` : prisma.$queryRaw``}
      TABLESAMPLE SYSTEM_ROWS(${Math.max(limit * 10, 100)})
    `
    
    if (randomIds.length === 0) return []
    
    // Get the actual videos with includes
    const videos = await prisma.video.findMany({
      where: {
        id: { in: randomIds.map((r: any) => r.id) },
        ...where
      },
      take: limit,
      include: { stream: true },
    })
    
    performanceMonitor.recordRandomSelection(Date.now() - startTime, 'TABLESAMPLE')
    return videos
  } catch (error) {
    performanceMonitor.recordRandomSelection(Date.now() - startTime, 'TABLESAMPLE', String(error))
    throw error
  }
}

/**
 * Optimized count function with caching
 */
async function getOptimizedCount(where: any, cacheKey: string): Promise<number> {
  const cachedCount = queryCache.get<number>(cacheKey)
  if (cachedCount !== null) {
    queryCache.trackHit()
    return cachedCount
  }
  
  queryCache.trackMiss()
  const count = await prisma.video.count({ where })
  queryCache.set(cacheKey, count)
  return count
}

const createVideoSchema = z.object({
  title: z.string().min(1),
  sourceUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
  duration: z.number().optional(),
  iframe: z.string().optional(),
  tags: z.string().optional(),
  performers: z.string().optional(),
  streamId: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  let cacheHit = false

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '4')
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const tags = searchParams.get('tags') || ''
    const cursor = searchParams.get('cursor') || ''
    const isRandom = searchParams.get('random') === 'true'

    // Generate cache keys
    const listCacheKey = videoCache.listKey({ page, limit, search, category, tags, cursor, random: isRandom })
    const countCacheKey = videoCache.countKey({ search, category, tags })

    // Try to get cached data first (skip cache for random to always get fresh random)
    if (!isRandom) {
      const cachedVideos = queryCache.get(listCacheKey)
      if (cachedVideos) {
        queryCache.trackHit()
        cacheHit = true
        return NextResponse.json(cachedVideos)
      }
      queryCache.trackMiss()
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    if (search) {
      where.OR = [
        { title: { startsWith: search, mode: 'insensitive' } },
        { tags: { contains: search } },
        { performers: { contains: search } },
      ]
    }

    if (category) {
      where.category = category
    }

    if (tags) {
      where.tags = tags
    }

    let videos = []
    let total = 0
    let hasNextPage = false
    let nextCursor = null

    if (isRandom) {
      // OPTIMIZED RANDOM MODE: Use random ID selection instead of OFFSET
      const randomStartTime = Date.now()
      videos = await getRandomVideos(where, limit)
      performanceMonitor.recordRandomSelection(Date.now() - randomStartTime, 'optimized')
      
      // Only count if we need total for pagination (cached)
      total = await getOptimizedCount(where, countCacheKey)
    } else {
      // NORMAL MODE: Use cursor-based pagination for better performance
      const paginationStartTime = Date.now()
      videos = await prisma.video.findMany({
        where,
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor } } : {}),
        orderBy: { createdAt: 'desc' },
        include: { stream: true },
      })
      performanceMonitor.recordPaginationQuery(Date.now() - paginationStartTime)

      const shouldCount = !cursor || page === 1
      if (shouldCount) {
        const cachedCount = queryCache.get<number>(countCacheKey)
        if (cachedCount !== null) {
          queryCache.trackHit()
          total = cachedCount
        } else {
          queryCache.trackMiss()
          const countStartTime = Date.now()
          total = await prisma.video.count({ where })
          performanceMonitor.recordCountQuery(Date.now() - countStartTime)
          queryCache.set(countCacheKey, total)
        }
      }

      hasNextPage = videos.length > limit
      if (hasNextPage) {
        videos.pop()
      }
      nextCursor = hasNextPage ? videos[videos.length - 1].id : null
    }

    const responseData = {
      videos,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNextPage,
        nextCursor,
        isRandom
      },
    }

    if (!isRandom) {
      queryCache.set(listCacheKey, responseData)
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Error fetching videos:', error)
    performanceMonitor.recordQuery('videos:list', Date.now() - startTime, cacheHit, String(error))
    return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 })
  } finally {
    // Always record the performance metric
    performanceMonitor.recordQuery('videos:list', Date.now() - startTime, cacheHit)
    
    // Log performance stats every 100 requests
    const stats = performanceMonitor.getStats()
    if (stats.totalQueries % 100 === 0) {
      console.log('[PERFORMANCE] Video API Stats:', stats)
    }
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await request.json()
    const validatedData = createVideoSchema.parse(body)

    const video = await prisma.video.create({
      data: {
        title: validatedData.title,
        ...(validatedData.sourceUrl && { sourceUrl: validatedData.sourceUrl }),
        thumbnailUrl: validatedData.thumbnailUrl || 'https://images.unsplash.com/photo-1594908900066-3f47337549d8?w=800&auto=format&fit=crop',
        duration: validatedData.duration,
        iframe: validatedData.iframe,
        tags: validatedData.tags,
        performers: validatedData.performers,
        streamId: validatedData.streamId,
      },
      include: { stream: true },
    })

    // Invalidate cache when new video is added
    videoCache.invalidateAll()

    performanceMonitor.recordQuery('videos:create', Date.now() - startTime, false)
    return NextResponse.json(video, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      performanceMonitor.recordQuery('videos:create', Date.now() - startTime, false, 'validation')
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error creating video:', error)
    performanceMonitor.recordQuery('videos:create', Date.now() - startTime, false, String(error))
    return NextResponse.json({ error: 'Failed to create video' }, { status: 500 })
  }
}
