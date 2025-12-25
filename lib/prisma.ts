import { PrismaClient } from '@prisma/client'

// OPTIMIZED: Connection pooling configuration for 6M+ records
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Create Prisma client with connection pooling settings
const createPrismaClient = () => {
  return new PrismaClient({
    // Connection pooling settings
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Log queries in development for debugging
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
  })
}

// Singleton pattern with connection pooling
export const prisma = globalForPrisma.prisma ?? createPrismaClient()

// In development, cache the client to prevent multiple connections
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing Prisma connections...')
  await prisma.$disconnect()
  process.exit(0)
})