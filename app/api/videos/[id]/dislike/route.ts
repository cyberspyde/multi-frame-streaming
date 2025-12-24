import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const video = await prisma.video.update({
      where: { id: params.id },
      data: { dislikes: { increment: 1 } },
    })

    return NextResponse.json(video)
  } catch (error) {
    console.error('Error disliking video:', error)
    return NextResponse.json({ error: 'Failed to dislike video' }, { status: 500 })
  }
}