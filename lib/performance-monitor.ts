/**
 * Performance Monitoring Utility
 * Tracks query performance, cache hit rates, and database metrics
 */

interface QueryMetrics {
  query: string
  duration: number
  timestamp: number
  cacheHit: boolean
  error?: string
}

interface PerformanceStats {
  totalQueries: number
  averageDuration: number
  cacheHitRate: number
  slowQueries: number
  errors: number
  p95Duration: number
}

class PerformanceMonitor {
  private metrics: QueryMetrics[] = []
  private readonly maxMetrics = 1000 // Keep last 1000 queries
  private readonly slowQueryThreshold = 1000 // 1 second

  /**
   * Record a query execution
   */
  recordQuery(query: string, duration: number, cacheHit: boolean, error?: string): void {
    const metric: QueryMetrics = {
      query,
      duration,
      timestamp: Date.now(),
      cacheHit,
      error,
    }

    this.metrics.push(metric)

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }

    // Log slow queries
    if (duration > this.slowQueryThreshold && !error) {
      console.warn(`[PERFORMANCE] Slow query detected: ${query} (${duration}ms)`)
    }

    // Log errors
    if (error) {
      console.error(`[PERFORMANCE] Query error: ${query} - ${error}`)
    }
  }

  /**
   * Get performance statistics
   */
  getStats(): PerformanceStats {
    const now = Date.now()
    const recentMetrics = this.metrics.filter(m => now - m.timestamp < 60000) // Last minute

    if (recentMetrics.length === 0) {
      return {
        totalQueries: 0,
        averageDuration: 0,
        cacheHitRate: 0,
        slowQueries: 0,
        errors: 0,
        p95Duration: 0,
      }
    }

    const durations = recentMetrics.map(m => m.duration).sort((a, b) => a - b)
    const totalDuration = durations.reduce((sum, d) => sum + d, 0)
    const cacheHits = recentMetrics.filter(m => m.cacheHit).length
    const slowQueries = recentMetrics.filter(m => m.duration > this.slowQueryThreshold).length
    const errors = recentMetrics.filter(m => m.error).length

    // Calculate P95 duration
    const p95Index = Math.floor(durations.length * 0.95)
    const p95Duration = durations[p95Index] || 0

    return {
      totalQueries: recentMetrics.length,
      averageDuration: Math.round(totalDuration / recentMetrics.length),
      cacheHitRate: Math.round((cacheHits / recentMetrics.length) * 100),
      slowQueries,
      errors,
      p95Duration,
    }
  }

  /**
   * Get slow queries
   */
  getSlowQueries(limit: number = 10): QueryMetrics[] {
    return this.metrics
      .filter(m => m.duration > this.slowQueryThreshold && !m.error)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit)
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit: number = 10): QueryMetrics[] {
    return this.metrics
      .filter(m => m.error)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = []
  }

  /**
   * Export metrics as JSON
   */
  export(): string {
    return JSON.stringify({
      stats: this.getStats(),
      slowQueries: this.getSlowQueries(5),
      recentErrors: this.getRecentErrors(5),
    }, null, 2)
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor()

/**
 * Database connection pool monitor
 */
export class ConnectionPoolMonitor {
  private poolStats = {
    totalConnections: 0,
    idleConnections: 0,
    activeConnections: 0,
    waitingRequests: 0,
  }

  updateStats(stats: {
    totalConnections: number
    idleConnections: number
    activeConnections: number
    waitingRequests: number
  }): void {
    this.poolStats = stats
    
    // Warn if pool is under pressure
    if (stats.waitingRequests > 5) {
      console.warn(`[CONNECTION POOL] High waiting requests: ${stats.waitingRequests}`)
    }
    
    if (stats.idleConnections === 0 && stats.activeConnections > 0) {
      console.warn(`[CONNECTION POOL] No idle connections, pool may be exhausted`)
    }
  }

  getStats() {
    return { ...this.poolStats }
  }
}

export const connectionPoolMonitor = new ConnectionPoolMonitor()

/**
 * Cache performance monitor
 */
export class CacheMonitor {
  private cacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    evictions: 0,
  }

  recordHit(): void {
    this.cacheStats.hits++
  }

  recordMiss(): void {
    this.cacheStats.misses++
  }

  updateSize(size: number): void {
    this.cacheStats.size = size
  }

  recordEviction(): void {
    this.cacheStats.evictions++
  }

  getStats() {
    const total = this.cacheStats.hits + this.cacheStats.misses
    const hitRate = total > 0 ? (this.cacheStats.hits / total) * 100 : 0
    
    return {
      ...this.cacheStats,
      hitRate: Math.round(hitRate),
    }
  }

  reset(): void {
    this.cacheStats = {
      hits: 0,
      misses: 0,
      size: 0,
      evictions: 0,
    }
  }
}

export const cacheMonitor = new CacheMonitor()

/**
 * Log performance metrics periodically
 */
export function startPerformanceLogging(intervalMs: number = 60000): void {
  setInterval(() => {
    const stats = performanceMonitor.getStats()
    const cacheStats = cacheMonitor.getStats()
    const poolStats = connectionPoolMonitor.getStats()

    if (stats.totalQueries > 0) {
      console.log(`[PERFORMANCE REPORT]`)
      console.log(`  Queries: ${stats.totalQueries} (avg: ${stats.averageDuration}ms, p95: ${stats.p95Duration}ms)`)
      console.log(`  Cache: ${cacheStats.hitRate}% hit rate (${cacheStats.hits}/${cacheStats.hits + cacheStats.misses})`)
      console.log(`  Pool: ${poolStats.activeConnections}/${poolStats.totalConnections} active, ${poolStats.waitingRequests} waiting`)
      console.log(`  Issues: ${stats.slowQueries} slow, ${stats.errors} errors`)
    }
  }, intervalMs)
}