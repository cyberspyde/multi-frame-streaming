#!/usr/bin/env ts-node

/**
 * Database Performance Benchmarking Script
 * Tests various query patterns and measures performance improvements
 */

import { PrismaClient } from '@prisma/client'
import { performanceMonitor } from '../lib/performance-monitor'

const prisma = new PrismaClient()

interface BenchmarkResult {
  name: string
  queryType: string
  duration: number
  iterations: number
  avgDuration: number
  minDuration: number
  maxDuration: number
  p95Duration: number
  errorCount: number
}

class DatabaseBenchmark {
  private results: BenchmarkResult[] = []
  private readonly iterations = 10
  private readonly warmupIterations = 3

  async runAllBenchmarks(): Promise<void> {
    console.log('🚀 Starting Database Performance Benchmarks\n')

    // Test different query patterns
    await this.benchmarkRandomSelection()
    await this.benchmarkCountQueries()
    await this.benchmarkPaginationQueries()
    await this.benchmarkSearchQueries()
    await this.benchmarkComplexQueries()

    this.generateReport()
    await this.cleanup()
  }

  private async benchmarkRandomSelection(): Promise<void> {
    console.log('📊 Testing Random Video Selection...')

    // Test optimized random selection
    await this.runBenchmark('Random Selection (Optimized)', 'random', async () => {
      const randomIds = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM videos 
        TABLESAMPLE SYSTEM_ROWS(100)
      `
      
      if (randomIds.length === 0) return []

      return await prisma.video.findMany({
        where: {
          id: { in: randomIds.map((r) => r.id) }
        },
        take: 10,
        include: { stream: true }
      })
    })

    // Test fallback random selection
    await this.runBenchmark('Random Selection (Fallback)', 'random', async () => {
      const maxId = await prisma.$queryRaw<{ max: bigint | null }[]>`
        SELECT MAX(id::bigint) as max FROM videos
      `
      
      const randomStart = Math.floor(Math.random() * (Number(maxId[0]?.max) || 100000))
      
      return await prisma.video.findMany({
        take: 10,
        skip: randomStart,
        orderBy: { id: 'asc' },
        include: { stream: true }
      })
    })

    // Test old-style random selection (if you want to compare)
    await this.runBenchmark('Random Selection (Legacy)', 'random', async () => {
      const count = await prisma.video.count()
      const skip = Math.floor(Math.random() * Math.max(0, count - 10))
      
      return await prisma.video.findMany({
        take: 10,
        skip,
        include: { stream: true }
      })
    })
  }

  private async benchmarkCountQueries(): Promise<void> {
    console.log('🔢 Testing Count Queries...')

    await this.runBenchmark('Simple Count', 'count', async () => {
      return await prisma.video.count()
    })

    await this.runBenchmark('Filtered Count', 'count', async () => {
      return await prisma.video.count({
        where: {
          category: 'entertainment'
        }
      })
    })

    await this.runBenchmark('Complex Count', 'count', async () => {
      return await prisma.video.count({
        where: {
          AND: [
            { category: 'entertainment' },
            { tags: { contains: 'funny' } },
            { views: { gt: 1000 } }
          ]
        }
      })
    })
  }

  private async benchmarkPaginationQueries(): Promise<void> {
    console.log('📋 Testing Pagination Queries...')

    await this.runBenchmark('Cursor Pagination', 'pagination', async () => {
      const videos = await prisma.video.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: { stream: true }
      })
      
      if (videos.length > 0) {
        return await prisma.video.findMany({
          take: 20,
          cursor: { id: videos[videos.length - 1].id },
          orderBy: { createdAt: 'desc' },
          include: { stream: true }
        })
      }
      
      return videos
    })

    await this.runBenchmark('Offset Pagination', 'pagination', async () => {
      return await prisma.video.findMany({
        take: 20,
        skip: 100,
        orderBy: { createdAt: 'desc' },
        include: { stream: true }
      })
    })
  }

  private async benchmarkSearchQueries(): Promise<void> {
    console.log('🔍 Testing Search Queries...')

    await this.runBenchmark('Title Search', 'search', async () => {
      return await prisma.video.findMany({
        where: {
          title: { startsWith: 'test', mode: 'insensitive' }
        },
        take: 10,
        include: { stream: true }
      })
    })

    await this.runBenchmark('Tag Search', 'search', async () => {
      return await prisma.video.findMany({
        where: {
          tags: { contains: 'funny' }
        },
        take: 10,
        include: { stream: true }
      })
    })

    await this.runBenchmark('Complex Search', 'search', async () => {
      return await prisma.video.findMany({
        where: {
          OR: [
            { title: { contains: 'test', mode: 'insensitive' } },
            { tags: { contains: 'funny' } },
            { performers: { contains: 'actor' } }
          ]
        },
        take: 10,
        include: { stream: true }
      })
    })
  }

  private async benchmarkComplexQueries(): Promise<void> {
    console.log('⚡ Testing Complex Queries...')

    await this.runBenchmark('Stream with Videos', 'complex', async () => {
      return await prisma.stream.findMany({
        include: {
          videos: {
            take: 5,
            orderBy: { createdAt: 'desc' }
          }
        }
      })
    })

    await this.runBenchmark('Aggregation Query', 'complex', async () => {
      return await prisma.$queryRaw<{ category: string; video_count: number; avg_views: number; latest_video: Date }[]>`
        SELECT 
          category,
          COUNT(*) as video_count,
          AVG(views) as avg_views,
          MAX(createdAt) as latest_video
        FROM videos 
        WHERE views > 1000
        GROUP BY category
        ORDER BY video_count DESC
        LIMIT 10
      `
    })
  }

  private async runBenchmark(
    name: string, 
    queryType: string, 
    queryFn: () => Promise<any>
  ): Promise<void> {
    const durations: number[] = []
    let errorCount = 0

    // Warmup iterations
    for (let i = 0; i < this.warmupIterations; i++) {
      try {
        await queryFn()
      } catch (error) {
        // Ignore warmup errors
      }
    }

    // Actual benchmark iterations
    for (let i = 0; i < this.iterations; i++) {
      const start = performance.now()
      
      try {
        await queryFn()
        const end = performance.now()
        durations.push(end - start)
      } catch (error) {
        errorCount++
        durations.push(0) // Mark as failed
      }
    }

    // Filter out failed queries for statistics
    const successfulDurations = durations.filter(d => d > 0)
    
    if (successfulDurations.length === 0) {
      console.log(`❌ ${name}: All queries failed`)
      return
    }

    successfulDurations.sort((a, b) => a - b)

    const avgDuration = successfulDurations.reduce((sum, d) => sum + d, 0) / successfulDurations.length
    const minDuration = successfulDurations[0]
    const maxDuration = successfulDurations[successfulDurations.length - 1]
    const p95Index = Math.floor(successfulDurations.length * 0.95)
    const p95Duration = successfulDurations[p95Index]

    const result: BenchmarkResult = {
      name,
      queryType,
      duration: avgDuration,
      iterations: this.iterations,
      avgDuration,
      minDuration,
      maxDuration,
      p95Duration,
      errorCount
    }

    this.results.push(result)

    console.log(`✅ ${name}:`)
    console.log(`   Avg: ${avgDuration.toFixed(2)}ms | Min: ${minDuration.toFixed(2)}ms | Max: ${maxDuration.toFixed(2)}ms`)
    console.log(`   P95: ${p95Duration.toFixed(2)}ms | Errors: ${errorCount}/${this.iterations}\n`)
  }

  private generateReport(): void {
    console.log('📈 Performance Benchmark Report\n')
    console.log('=' .repeat(80))

    // Group by query type
    const byType = this.results.reduce((acc, result) => {
      if (!acc[result.queryType]) acc[result.queryType] = []
      acc[result.queryType].push(result)
      return acc
    }, {} as Record<string, BenchmarkResult[]>)

    Object.entries(byType).forEach(([type, results]) => {
      console.log(`\n${type.toUpperCase()} QUERIES:`)
      console.log('-'.repeat(40))
      
      results.sort((a, b) => a.avgDuration - b.avgDuration)
      
      results.forEach(result => {
        const improvement = result.name.includes('Legacy') 
          ? ` vs ${result.avgDuration.toFixed(0)}ms (legacy)`
          : ''
          
        console.log(`${result.name}:`)
        console.log(`  📊 Avg: ${result.avgDuration.toFixed(2)}ms | P95: ${result.p95Duration.toFixed(2)}ms`)
        console.log(`  🎯 Min: ${result.minDuration.toFixed(2)}ms | Max: ${result.maxDuration.toFixed(2)}ms`)
        console.log(`  ❌ Errors: ${result.errorCount}/${result.iterations}${improvement}\n`)
      })
    })

    // Performance summary
    console.log('📊 SUMMARY:')
    console.log('='.repeat(80))
    
    const totalQueries = this.results.reduce((sum, r) => sum + r.iterations, 0)
    const totalErrors = this.results.reduce((sum, r) => sum + r.errorCount, 0)
    const successRate = ((totalQueries - totalErrors) / totalQueries) * 100
    
    console.log(`Total Queries: ${totalQueries}`)
    console.log(`Total Errors: ${totalErrors}`)
    console.log(`Success Rate: ${successRate.toFixed(1)}%`)
    
    // Find fastest and slowest
    const fastest = this.results.reduce((min, r) => r.avgDuration < min.avgDuration ? r : min)
    const slowest = this.results.reduce((max, r) => r.avgDuration > max.avgDuration ? r : max)
    
    console.log(`\n🏆 Fastest: ${fastest.name} (${fastest.avgDuration.toFixed(2)}ms)`)
    console.log(`🐌 Slowest: ${slowest.name} (${slowest.avgDuration.toFixed(2)}ms)`)
    
    if (slowest.avgDuration > 0) {
      const improvementRatio = slowest.avgDuration / fastest.avgDuration
      console.log(`📈 Performance Gap: ${improvementRatio.toFixed(1)}x slower`)
    }
  }

  private async cleanup(): Promise<void> {
    await prisma.$disconnect()
    console.log('\n✅ Benchmark completed successfully!')
  }
}

// Run the benchmark
if (require.main === module) {
  const benchmark = new DatabaseBenchmark()
  benchmark.runAllBenchmarks().catch(console.error)
}

export { DatabaseBenchmark }