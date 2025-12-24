import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import puppeteer from 'puppeteer'
import * as cheerio from 'cheerio'

export async function POST(request: NextRequest) {
  try {
    const { streamId } = await request.json()

    const stream = await prisma.stream.findUnique({
      where: { id: streamId },
    })

    if (!stream) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 })
    }

    // For demo, let's simulate scraping some videos
    // In real implementation, use Puppeteer to scrape the site
    const scrapedVideos = [
      {
        title: `Scraped Video 1 from ${stream.name}`,
        sourceUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Big_buck_bunny_poster_big.jpg/800px-Big_buck_bunny_poster_big.jpg',
        duration: 596,
        streamId: stream.id,
      },
      {
        title: `Scraped Video 2 from ${stream.name}`,
        sourceUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Elephants_Dream_poster_big.jpg/800px-Elephants_Dream_poster_big.jpg',
        duration: 654,
        streamId: stream.id,
      },
    ]

    const videos = await prisma.$transaction(
      scrapedVideos.map(video => prisma.video.create({ data: video }))
    )

    // Update lastPulled
    await prisma.stream.update({
      where: { id: stream.id },
      data: { lastPulled: new Date() },
    })

    return NextResponse.json({ videos, count: videos.length })
  } catch (error) {
    console.error('Error scraping:', error)
    return NextResponse.json({ error: 'Failed to scrape videos' }, { status: 500 })
  }
}