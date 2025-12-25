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
      // RANDOM MODE: Prioritize unwatched (views = 0)
      const unwatchedWhere = { ...where, views: 0 }
      const unwatchedCount = await prisma.video.count({ where: unwatchedWhere })

      if (unwatchedCount > 0) {
        const skip = Math.max(0, Math.floor(Math.random() * (unwatchedCount - limit)))
        videos = await prisma.video.findMany({
          where: unwatchedWhere,
          take: limit,
          skip: skip,
          include: { stream: true },
        })
        total = unwatchedCount
      } else {
        // Fallback to all videos if no unwwatched left
        const totalCount = await prisma.video.count({ where })
        const skip = Math.max(0, Math.floor(Math.random() * (totalCount - limit)))
        videos = await prisma.video.findMany({
          where,
          take: limit,
          skip: skip,
          include: { stream: true },
        })
        total = totalCount
      }
    } else {
      // NORMAL MODE
      videos = await prisma.video.findMany({
        where,
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor } } : {}),
        orderBy: { createdAt: 'desc' },
        include: { stream: true },
      })

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
