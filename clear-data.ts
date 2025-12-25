import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function clearData() {
  console.log('Clearing all video data...')
  await prisma.video.deleteMany({})
  console.log('All videos deleted')
  await prisma.$disconnect()
}

clearData().catch(console.error)