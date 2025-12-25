import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

interface CSVRow {
  video_url: string
  title: string
  duration: string
  tags: string
  actors: string
  views: string
  quality: string
  publish_date: string
}

function parseCSVRow(row: string): CSVRow {
  // Split by semicolon
  const parts = row.split(';')
  return {
    video_url: parts[0] || '',
    title: parts[1] || '',
    duration: parts[2] || '',
    tags: parts[3] || '',
    actors: parts[4] || '',
    views: parts[5] || '',
    quality: parts[6] || '',
    publish_date: parts[7] || ''
  }
}

function extractVideoId(url: string): string | null {
  const match = url.match(/video\.([a-z0-9]+)/)
  return match ? match[1] : null
}

function constructIframe(videoId: string): string {
  return `<iframe src="https://www.xvideos.com/embedframe/${videoId}" frameborder="0" width="510" height="400" scrolling="no" allowfullscreen="allowfullscreen"></iframe>`
}

function parseDuration(durationStr: string): number | null {
  // Parse "1305 sec" to 1305
  const match = durationStr.match(/(\d+)\s*sec/)
  return match ? parseInt(match[1]) : null
}

async function importCSV() {
  const csvPath = path.join(process.cwd(), 'data_clean_1000.csv')

  if (!fs.existsSync(csvPath)) {
    console.error('CSV file not found:', csvPath)
    return
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const rows = csvContent.split('\n').filter(row => row.trim())

  console.log(`Found ${rows.length} rows in CSV`)

  let imported = 0
  let skipped = 0

  for (const row of rows.slice(1)) { // Skip header
    try {
      const data = parseCSVRow(row)

      if (!data.title || !data.video_url) {
        skipped++
        continue
      }

      const videoId = extractVideoId(data.video_url)
      if (!videoId) {
        skipped++
        continue
      }

      const iframe = constructIframe(videoId)
      const duration = parseDuration(data.duration)

      await prisma.video.create({
        data: {
          title: data.title,
          sourceUrl: data.video_url,
          thumbnailUrl: data.publish_date, // This seems to be the thumbnail URL in this CSV
          duration: duration,
          iframe: iframe,
          tags: data.tags,
          performers: data.actors,
          category: data.quality,
        }
      })

      imported++
      if (imported % 100 === 0) {
        console.log(`Imported ${imported} videos...`)
      }
    } catch (error) {
      console.error('Error importing row:', row, error)
      skipped++
    }
  }

  console.log(`Import complete: ${imported} imported, ${skipped} skipped`)
}

importCSV()
  .catch(console.error)
  .finally(() => prisma.$disconnect())