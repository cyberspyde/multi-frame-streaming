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

function parseCSVRow(row: string): CSVRow | null {
  if (!row.trim()) return null
  
  // Split by semicolon character
  const parts = row.split(';')
  
  // Ensure we have enough parts (15 columns)
  if (parts.length < 15) {
    return null
  }
  
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

function parseViews(viewsStr: string): number {
  if (!viewsStr) return 0
  // Remove commas and convert to number
  return parseInt(viewsStr.replace(/,/g, '')) || 0
}

async function importCSVFile(filePath: string): Promise<{ imported: number, skipped: number }> {
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
      const views = parseViews(data.views)
      
      // Use thumbnailUrl2 as primary thumbnail (seems more reliable based on preview)
      const thumbnailUrl = data.thumbnailUrl2 || data.thumbnailUrl

      await prisma.video.create({
        data: {
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
          views: views,
          streamId: null
        }
      })

      imported++
      
      // Progress update every 1000 records
      if (imported % 1000 === 0) {
        console.log(`  Progress: ${imported} imported, ${skipped} skipped`)
      }

      // Stop after 1000 rows for testing
      if (imported >= 1000) {
        console.log('Stopping after 1000 rows for testing')
        break
      }

    } catch (error) {
      console.error(`Error on line ${lineNumber}:`, error)
      skipped++
    }
  }

  rl.close()
  return { imported, skipped }
}

async function main() {
  console.log('Starting CSV import process...')
  console.log('Database URL:', process.env.DATABASE_URL)

  // Test database connection first
  try {
    await prisma.$connect()
    console.log('✓ Database connection successful')
  } catch (error) {
    console.error('✗ Database connection failed:', error)
    return
  }

  // Get CSV files from E: drive
  const csvFiles = [
    'e:\\project-serious\\data_clean_part_1.csv'
  ]

  let totalImported = 0
  let totalSkipped = 0

  for (const csvFile of csvFiles) {
    // Use absolute path if it starts with a drive letter, otherwise join with cwd
    const filePath = csvFile.includes(':') ? csvFile : path.join(process.cwd(), csvFile)
    const result = await importCSVFile(filePath)
    
    totalImported += result.imported
    totalSkipped += result.skipped
    
    console.log(`✓ ${csvFile}: ${result.imported} imported, ${result.skipped} skipped`)
  }

  console.log(`\n=== IMPORT COMPLETE ===`)
  console.log(`Total imported: ${totalImported}`)
  console.log(`Total skipped: ${totalSkipped}`)
  console.log(`Final total: ${totalImported + totalSkipped}`)

  await prisma.$disconnect()
}

// Run if called directly
if (require.main === module) {
  main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
}

export { main as importLargeCSV }