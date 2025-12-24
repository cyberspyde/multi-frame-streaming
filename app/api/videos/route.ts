import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createVideoSchema = z.object({
  title: z.string().min(1),
  sourceUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  duration: z.number().optional(),
  streamId: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '4')
    const skip = (page - 1) * limit

    const videos = await prisma.video.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { stream: true },
    })

    const total = await prisma.video.count()

    return NextResponse.json({
      videos,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching videos:', error)
    return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = createVideoSchema.parse(body)

    const video = await prisma.video.create({
      data: {
        title: validatedData.title,
        sourceUrl: validatedData.sourceUrl,
        thumbnailUrl: validatedData.thumbnailUrl || 'https://images.unsplash.com/photo-1594908900066-3f47337549d8?w=800&auto=format&fit=crop',
        duration: validatedData.duration,
        streamId: validatedData.streamId,
      },
      include: { stream: true },
    })

    return NextResponse.json(video, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error creating video:', error)
    return NextResponse.json({ error: 'Failed to create video' }, { status: 500 })
  }
}