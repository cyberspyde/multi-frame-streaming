#!/usr/bin/env ts-node

/**
 * Real-time Performance Monitor
 * Monitors live API performance and generates reports
 */

import { performanceMonitor } from '../lib/performance-monitor'

interface LiveMetrics {
  timestamp: number
  totalQueries: number
  averageDuration: number
  cacheHitRate: number
  slowQueries: number
  errors: number
  p95Duration: number
}

class LivePerformanceMonitor {
  private metrics: LiveMetrics[] = []
  private monitoring = false
  private intervalId?: NodeJS.Timeout

  startMonitoring(intervalMs: number = 5000): void {
    if (this.monitoring) {
      console.log('⚠️  Monitoring already running')
      return
    }

    this.monitoring = true
    console.log('🚀 Starting live performance monitoring...')

    this.intervalId = setInterval(() => {
      this.captureMetrics()
    }, intervalMs)

    // Initial capture
    this.captureMetrics()
  }

  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = undefined
    }
    this.monitoring = false
    console.log('🛑 Stopped performance monitoring')
  }

  private captureMetrics(): void {
    const stats = performanceMonitor.getStats()
    const metric: LiveMetrics = {
      timestamp: Date.now(),
      totalQueries: stats.totalQueries,
      averageDuration: stats.averageDuration,
      cacheHitRate: stats.cacheHitRate,
      slowQueries: stats.slowQueries,
      errors: stats.errors,
      p95Duration: stats.p95Duration
    }

    this.metrics.push(metric)

    // Keep only last 100 measurements
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100)
    }

    this.logCurrentMetrics(metric)
  }

  private logCurrentMetrics(metric: LiveMetrics): void {
    const time = new Date(metric.timestamp).toLocaleTimeString()
    
    console.log(`\n📊 [${time}] Live Metrics:`)
    console.log(`   Queries: ${metric.totalQueries}`)
    console.log(`   Avg Duration: ${metric.averageDuration}ms`)
    console.log(`   Cache Hit Rate: ${metric.cacheHitRate}%`)
    console.log(`   Slow Queries: ${metric.slowQueries}`)
    console.log(`   Errors: ${metric.errors}`)
    console.log(`   P95 Duration: ${metric.p95Duration}ms`)
  }

  generateReport(): void {
    if (this.metrics.length === 0) {
      console.log('❌ No metrics available')
      return
    }

    console.log('\n📈 Live Performance Report')
    console.log('=' .repeat(60))

    const first = this.metrics[0]
    const last = this.metrics[this.metrics.length - 1]

    console.log(`\n📊 Overall Statistics:`)
    console.log(`   Monitoring Duration: ${Math.round((last.timestamp - first.timestamp) / 1000)}s`)
    console.log(`   Data Points: ${this.metrics.length}`)
    console.log(`   Total Queries: ${last.totalQueries - first.totalQueries}`)

    // Calculate trends
    const durationTrend = last.averageDuration - first.averageDuration
    const cacheTrend = last.cacheHitRate - first.cacheHitRate
    const errorTrend = last.errors - first.errors

    console.log(`\n📈 Trends:`)
    console.log(`   Avg Duration: ${durationTrend > 0 ? '↑' : '↓'} ${Math.abs(durationTrend)}ms`)
    console.log(`   Cache Hit Rate: ${cacheTrend > 0 ? '↑' : '↓'} ${Math.abs(cacheTrend)}%`)
    console.log(`   Errors: ${errorTrend > 0 ? '↑' : '↓'} ${Math.abs(errorTrend)}`)

    // Performance analysis
    const avgDuration = this.metrics.reduce((sum, m) => sum + m.averageDuration, 0) / this.metrics.length
    const maxDuration = Math.max(...this.metrics.map(m => m.averageDuration))
    const minDuration = Math.min(...this.metrics.map(m => m.averageDuration))

    console.log(`\n🎯 Performance Analysis:`)
    console.log(`   Average Duration: ${avgDuration.toFixed(2)}ms`)
    console.log(`   Min Duration: ${minDuration.toFixed(2)}ms`)
    console.log(`   Max Duration: ${maxDuration.toFixed(2)}ms`)
    console.log(`   Variance: ${((maxDuration - minDuration) / avgDuration * 100).toFixed(1)}%`)

    // Recommendations
    console.log(`\n💡 Recommendations:`)
    
    if (avgDuration > 1000) {
      console.log(`   ⚠️  Average query time is high (${avgDuration.toFixed(0)}ms). Consider optimization.`)
    } else if (avgDuration < 100) {
      console.log(`   ✅ Query performance is excellent (${avgDuration.toFixed(0)}ms).`)
    } else {
      console.log(`   📈 Query performance is good (${avgDuration.toFixed(0)}ms).`)
    }

    if (cacheHitRate < 50) {
      console.log(`   ⚠️  Low cache hit rate (${cacheHitRate}%). Review caching strategy.`)
    } else {
      console.log(`   ✅ Cache hit rate is good (${cacheHitRate}%).`)
    }

    if (errorTrend > 0) {
      console.log(`   ⚠️  Error rate is increasing. Check error logs.`)
    }
  }

  exportMetrics(): string {
    return JSON.stringify(this.metrics, null, 2)
  }

  clearMetrics(): void {
    this.metrics = []
    console.log('🧹 Cleared all metrics')
  }
}

// CLI interface
if (require.main === module) {
  const monitor = new LivePerformanceMonitor()
  
  const args = process.argv.slice(2)
  const command = args[0]

  switch (command) {
    case 'start':
      const interval = parseInt(args[1]) || 5000
      monitor.startMonitoring(interval)
      
      // Stop after 5 minutes by default
      setTimeout(() => {
        monitor.stopMonitoring()
        monitor.generateReport()
        process.exit(0)
      }, 300000)
      break

    case 'stop':
      monitor.stopMonitoring()
      break

    case 'report':
      monitor.generateReport()
      break

    case 'export':
      console.log(monitor.exportMetrics())
      break

    case 'clear':
      monitor.clearMetrics()
      break

    default:
      console.log(`
Usage: ts-node scripts/live-monitor.ts <command>

Commands:
  start [interval]  Start monitoring (default 5s interval)
  stop              Stop monitoring
  report            Generate performance report
  export            Export metrics as JSON
  clear             Clear all metrics

Examples:
  ts-node scripts/live-monitor.ts start 10000  # Monitor every 10s
  ts-node scripts/live-monitor.ts report       # Show report
  ts-node scripts/live-monitor.ts export > metrics.json
      `)
  }
}

export { LivePerformanceMonitor }