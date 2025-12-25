import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkData() {
  console.log('Checking imported data...')
  const videos = await prisma.video.findMany({
    take: 5,
    select: {
      title: true,
      category: true,
      quality: true,
      thumbnailUrl: true,
      publishDate: true,
      uploader: true,
      views: true
    }
  })

  console.log('Sample records:')
  videos.forEach((video, i) => {
    console.log(`${i + 1}. Title: ${video.title.substring(0, 50)}...`)
    console.log(`   Category: ${video.category}`)
    console.log(`   Quality: ${video.quality}`)
    console.log(`   Uploader: ${video.uploader}`)
    console.log(`   Publish Date: ${video.publishDate}`)
    console.log(`   Views: ${video.views}`)
    console.log(`   Thumbnail: ${video.thumbnailUrl?.substring(0, 50)}...`)
    console.log('')
  })

  await prisma.$disconnect()
}

checkData().catch(console.error)