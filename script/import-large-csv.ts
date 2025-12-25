import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as readline from 'readline'
import * as path from 'path'

const prisma = new PrismaClient()

interface CSVRow {
  url: string
  title: string
  duration: string
  thumbnailUrl: string
  iframe: string
  tags: string
  actors: string
  views: string
  category: string
  quality: string
  uploader: string
  empty: string
  publishDate: string
  thumbnailUrl2: string
  status: string
}

interface VideoData {
  title: string
  sourceUrl: string
  thumbnailUrl: string
  duration: number | null
  likes: number
  dislikes: number
  category: string
  iframe: string
  tags: string
  performers: string
  quality: string
  uploader: string
  publishDate: string
  views: number
  streamId: string | null
}

function parseCSVRow(row: string): CSVRow | null {
  if (!row.trim()) return null
  const parts = row.split(';')
  if (parts.length < 15) return null

  return {
    url: parts[0]?.trim() || '',
    title: parts[1]?.trim() || '',
    duration: parts[2]?.trim() || '',
    thumbnailUrl: parts[3]?.trim() || '',
    iframe: parts[4]?.trim() || '',
    tags: parts[5]?.trim() || '',
    actors: parts[6]?.trim() || '',
    views: parts[7]?.trim() || '',
    category: parts[8]?.trim() || '',
    quality: parts[9]?.trim() || '',
    uploader: parts[10]?.trim() || '',
    empty: parts[11]?.trim() || '',
    publishDate: parts[12]?.trim() || '',
    thumbnailUrl2: parts[13]?.trim() || '',
    status: parts[14]?.trim() || ''
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
  if (!durationStr) return null
  const match = durationStr.match(/(\d+)\s*sec/)
  return match ? parseInt(match[1]) : null
}

async function importCSVFile(
  filePath: string,
  batchSize: number = 5000
): Promise<{ imported: number; skipped: number }> {
  console.log(`\nProcessing: ${path.basename(filePath)}`)

  if (!fs.existsSync(filePath)) {
    console.error('CSV file not found:', filePath)
    return { imported: 0, skipped: 0 }
  }

  const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' })
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  })

  let imported = 0
  let skipped = 0
  let lineNumber = 0
  let batch: VideoData[] = []

  const insertBatch = async (records: VideoData[]) => {
    if (records.length === 0) return 0

    try {
      await prisma.video.createMany({
        data: records,
        skipDuplicates: true // Skip if duplicate key errors occur
      })
      return records.length
    } catch (error) {
      console.error('Batch insert error:', error)
      // Fallback: try inserting one by one
      let successCount = 0
      for (const record of records) {
        try {
          await prisma.video.create({ data: record })
          successCount++
        } catch (err) {
          // Skip individual failures silently
        }
      }
      return successCount
    }
  }

  for await (const line of rl) {
    lineNumber++

    // Skip header row
    if (lineNumber === 1) {
      console.log('Skipping header row')
      continue
    }

    try {
      const data = parseCSVRow(line)

      if (!data || !data.title || !data.url) {
        skipped++
        continue
      }

      const videoId = extractVideoId(data.url)
      if (!videoId) {
        skipped++
        continue
      }

      const iframe = constructIframe(videoId)
      const duration = parseDuration(data.duration)
      const thumbnailUrl = data.thumbnailUrl2 || data.thumbnailUrl

      batch.push({
        title: data.title,
        sourceUrl: data.url,
        thumbnailUrl: thumbnailUrl,
        duration: duration,
        likes: 0,
        dislikes: 0,
        category: data.category,
        iframe: iframe,
        tags: data.tags,
        performers: data.actors,
        quality: data.quality,
        uploader: data.uploader,
        publishDate: data.publishDate,
        views: 0, // Set to 0 as requested
        streamId: null
      })

      // Insert batch when it reaches the batch size
      if (batch.length >= batchSize) {
        const insertedCount = await insertBatch(batch)
        imported += insertedCount
        console.log(`  Progress: ${imported} imported, ${skipped} skipped`)
        batch = []
      }

    } catch (error) {
      console.error(`Error on line ${lineNumber}:`, error)
      skipped++
    }
  }

  // Insert remaining records
  if (batch.length > 0) {
    const insertedCount = await insertBatch(batch)
    imported += insertedCount
  }

  rl.close()
  return { imported, skipped }
}

async function main() {
  console.log('Starting OPTIMIZED CSV import process...')
  console.log('Database URL:', process.env.DATABASE_URL)

  // Test database connection
  try {
    await prisma.$connect()
    console.log('✓ Database connection successful')
  } catch (error) {
    console.error('✗ Database connection failed:', error)
    return
  }

  // List all 7 CSV files
  const csvFiles = [
    'e:\\project-serious\\data_clean_part_1.csv',
    'e:\\project-serious\\data_clean_part_2.csv',
    'e:\\project-serious\\data_clean_part_3.csv',
    'e:\\project-serious\\data_clean_part_4.csv',
    'e:\\project-serious\\data_clean_part_5.csv',
    'e:\\project-serious\\data_clean_part_6.csv',
    'e:\\project-serious\\data_clean_part_7.csv'
  ]

  let totalImported = 0
  let totalSkipped = 0
  const startTime = Date.now()

  for (const csvFile of csvFiles) {
    const fileStartTime = Date.now()
    const filePath = csvFile.includes(':') ? csvFile : path.join(process.cwd(), csvFile)
    const result = await importCSVFile(filePath, 5000) // Batch size of 5000

    totalImported += result.imported
    totalSkipped += result.skipped

    const fileTime = ((Date.now() - fileStartTime) / 1000 / 60).toFixed(2)
    console.log(`✓ ${path.basename(csvFile)}: ${result.imported} imported, ${result.skipped} skipped (${fileTime} min)`)
  }

  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(2)

  console.log(`\n=== IMPORT COMPLETE ===`)
  console.log(`Total imported: ${totalImported}`)
  console.log(`Total skipped: ${totalSkipped}`)
  console.log(`Final total: ${totalImported + totalSkipped}`)
  console.log(`Total time: ${totalTime} minutes`)
  console.log(`Average speed: ${(totalImported / (Date.now() - startTime) * 1000).toFixed(0)} records/second`)

  await prisma.$disconnect()
}

// Run if called directly
if (require.main === module) {
  main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
}

export { main as importLargeCSV }