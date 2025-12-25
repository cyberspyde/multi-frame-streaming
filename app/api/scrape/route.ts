import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { load } from 'cheerio'
import { z } from 'zod'

type Candidate = { title: string; sourceUrl: string; thumbnailUrl: string; duration: number | null };

const requestSchema = z.object({
  url: z.string().url(),
  streamId: z.string().optional(),
  mode: z.enum(['legacy', 'ytdlp']).default('ytdlp'),
})

const FALLBACK_THUMBNAIL = 'https://images.unsplash.com/photo-1594908900066-3f47337549d8?w=800&auto=format&fit=crop'

function toAbsolute(url: string | undefined, base: string): string | null {
  if (!url) return null
  try {
    return new URL(url, base).toString()
  } catch {
    return null
  }
}

function dedupePush(list: Candidate[], seen: Set<string>, item: Candidate) {
  if (seen.has(item.sourceUrl)) return
  seen.add(item.sourceUrl)
  list.push(item)
}

async function scrapeLegacy(url: string): Promise<Candidate[]> {
  const pageRes = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HyperStreamBot/1.0; +https://example.com)' },
  })
  if (!pageRes.ok) throw new Error(`Upstream responded ${pageRes.status}`)

  const html = await pageRes.text()
  const $ = load(html)
  const candidates: Candidate[] = []
  const seen = new Set<string>()

  const pageTitle = $('meta[property="og:title"]').attr('content')?.trim() || $('title').first().text().trim() || 'Untitled video'
  const ogImage = toAbsolute($('meta[property="og:image"]').attr('content'), url) || FALLBACK_THUMBNAIL

  const addCandidate = (src?: string | null, thumb?: string | null, title?: string) => {
    const abs = toAbsolute(src || undefined, url)
    if (!abs) return
    dedupePush(candidates, seen, {
      title: (title || pageTitle).slice(0, 200) || 'Untitled video',
      sourceUrl: abs,
      thumbnailUrl: thumb || ogImage,
      duration: null,
    })
  }

  $('meta[property="og:video"], meta[property="og:video:url"], meta[property="og:video:secure_url"]').each((_index, el) => {
    addCandidate($(el).attr('content'))
  })

  $('video').each((_index, videoEl) => {
    addCandidate($(videoEl).attr('src'))
    $(videoEl)
      .find('source')
      .each((_i, sourceEl) => addCandidate($(sourceEl).attr('src')))
  })

  $('a[href]').each((_index, link) => {
    const href = $(link).attr('href')
    if (href && /\.(mp4|webm|ogg|m3u8)(\?.*)?$/i.test(href)) addCandidate(href)
  })

  return candidates
}

async function scrapeWithYtDlp(url: string): Promise<Candidate[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod: any = await import('ytdlp-nodejs')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const yt: any = (mod && (mod.default || mod))

  const info = (await yt.getInfo?.(url)) ?? null
  const entries = Array.isArray(info?.entries) ? info.entries : info ? [info] : []
  const candidates: Candidate[] = []
  const seen = new Set<string>()

  for (const entry of entries) {
    const title = entry?.title || entry?.videoDetails?.title || 'Untitled video'
    const thumbs = entry?.thumbnail || entry?.thumbnails || entry?.videoDetails?.thumbnails || []
    const thumbUrl = Array.isArray(thumbs) ? (thumbs[0]?.url || thumbs[0]) : undefined
    const formats = entry?.formats || entry?.streamingData?.formats || []

    for (const fmt of formats) {
      const src = fmt?.url || fmt?.downloadUrl
      if (!src) continue
      dedupePush(candidates, seen, {
        title,
        sourceUrl: src,
        thumbnailUrl: thumbUrl || FALLBACK_THUMBNAIL,
        duration: entry?.duration || entry?.durationSeconds || null,
      })
    }
  }

  return candidates
}


export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, streamId, mode } = requestSchema.parse(body)

    // Verify stream if provided
    let stream = null
    if (streamId) {
      stream = await prisma.stream.findUnique({ where: { id: streamId } })
      if (!stream) {
        return NextResponse.json({ error: 'Stream not found' }, { status: 404 })
      }
    }

    let candidates: Candidate[] = []
    if (mode === 'ytdlp') {
      candidates = await scrapeWithYtDlp(url)
    } else {
      candidates = await scrapeLegacy(url)
    }

    // If nothing found, return empty with warning instead of 404 so UI can show message without failing
    if (candidates.length === 0) {
      return NextResponse.json({
        videos: [],
        count: 0,
        scrapedFrom: url,
        mode,
        warning: 'No videos found on that page. For YouTube, pass a specific watch/playlists URL.',
      })
    }

    let saved: Candidate[] = candidates
    if (stream) {
      const dbVideos = await prisma.$transaction(
        candidates
          .filter((video) => video.sourceUrl)
          .map((video) =>
          prisma.video.create({
            data: {
              title: video.title,
              sourceUrl: video.sourceUrl,
              thumbnailUrl: video.thumbnailUrl || FALLBACK_THUMBNAIL,
              duration: video.duration || undefined,
              streamId: stream!.id,
            },
          })
        )
      )
      saved = dbVideos.map(v => ({
        title: v.title,
        sourceUrl: v.sourceUrl!,
        thumbnailUrl: v.thumbnailUrl,
        duration: v.duration,
      }))

      await prisma.stream.update({
        where: { id: stream.id },
        data: { lastPulled: new Date() },
      })
    }

    return NextResponse.json({
      videos: saved,
      count: saved.length,
      scrapedFrom: url,
      mode,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('Error scraping:', error)
    return NextResponse.json({ error: 'Failed to scrape videos' }, { status: 500 })
  }
}