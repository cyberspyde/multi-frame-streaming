import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createStreamSchema = z.object({
  name: z.string().min(1),
  source: z.string().min(1),
  query: z.string().min(1),
})

export async function GET() {
  try {
    const streams = await prisma.stream.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { videos: true },
        },
      },
    })

    return NextResponse.json(streams)
  } catch (error) {
    console.error('Error fetching streams:', error)
    return NextResponse.json({ error: 'Failed to fetch streams' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = createStreamSchema.parse(body)

    const stream = await prisma.stream.create({
      data: validatedData,
    })

    return NextResponse.json(stream, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error creating stream:', error)
    return NextResponse.json({ error: 'Failed to create stream' }, { status: 500 })
  }
}