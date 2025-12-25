import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { queryCache, videoCache } from '@/lib/query-cache'
import { performanceMonitor } from '@/lib/performance-monitor'

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

    // Generate cache keys
    const listCacheKey = videoCache.listKey({ page, limit, search, category, tags, cursor })
    const countCacheKey = videoCache.countKey({ search, category, tags })
    
    // Try to get cached data first
    const cachedVideos = queryCache.get(listCacheKey)
    if (cachedVideos) {
      queryCache.trackHit()
      cacheHit = true
      return NextResponse.json(cachedVideos)
    }
    queryCache.trackMiss()

    // OPTIMIZED: Build filter conditions with indexed queries
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}
    
    // Use exact matches where possible for better performance
    if (search) {
      // For search, use startsWith instead of contains for better index usage
      // Also limit the OR conditions to avoid full table scans
      where.OR = [
        { title: { startsWith: search, mode: 'insensitive' } },
        { tags: { contains: search } }, // contains needed for tags
        { performers: { contains: search } },
      ]
    }
    
    if (category) {
      // Exact match for category - much faster
      where.category = category
    }
    
    if (tags) {
      // Exact match for tags
      where.tags = tags
    }

    // OPTIMIZED: Use cursor-based pagination for better performance
    // This avoids the performance hit of skip/take on large datasets
    const videos = await prisma.video.findMany({
      where,
      take: limit + 1, // Fetch one extra to determine if there are more
      ...(cursor ? { cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
      include: { stream: true },
    })

    // OPTIMIZED: Count with caching
    let total: number | undefined
    const shouldCount = !cursor || page === 1
    
    if (shouldCount) {
      const cachedCount = queryCache.get<number>(countCacheKey)
      if (cachedCount !== null) {
        queryCache.trackHit()
        total = cachedCount
      } else {
        queryCache.trackMiss()
        total = await prisma.video.count({ where })
        queryCache.set(countCacheKey, total)
      }
    }
    
    // Determine if there are more pages
    const hasNextPage = videos.length > limit
    if (hasNextPage) {
      videos.pop() // Remove the extra item
    }
    
    // Generate next cursor
    const nextCursor = hasNextPage ? videos[videos.length - 1].id : null

    const responseData = {
      videos,
      pagination: {
        page,
        limit,
        total: total ?? undefined,
        pages: total ? Math.ceil(total / limit) : undefined,
        hasNextPage,
        nextCursor,
      },
    }

    // Cache the response
    queryCache.set(listCacheKey, responseData)

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Error fetching videos:', error)
    performanceMonitor.recordQuery('videos:list', Date.now() - startTime, cacheHit, String(error))
    return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 })
  } finally {
    // Always record the performance metric
    performanceMonitor.recordQuery('videos:list', Date.now() - startTime, cacheHit)
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
