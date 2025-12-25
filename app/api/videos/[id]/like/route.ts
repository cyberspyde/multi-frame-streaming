import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,

  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const video = await prisma.video.update({
      where: { id },
      data: { likes: { increment: 1 } },
    })

    return NextResponse.json(video)
  } catch (error) {
    console.error('Error liking video:', error)
    return NextResponse.json({ error: 'Failed to like video' }, { status: 500 })
  }
}