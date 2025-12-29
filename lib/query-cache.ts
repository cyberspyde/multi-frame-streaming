/**
 * Query Cache Utility for Multi-Frame Streaming
 * Optimized for 6M+ records with intelligent caching strategies
 */

import { cacheMonitor } from './performance-monitor'

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class QueryCache {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private cache = new Map<string, CacheEntry<any>>()
  private maxSize = 100 // Maximum number of cached queries
  private defaultTTL = 1000 * 60 * 5 // 5 minutes default TTL

  /**
   * Generate cache key from query parameters
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  generateKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params).sort().reduce((acc, key) => {
      if (params[key] !== undefined && params[key] !== '') {
        acc[key] = params[key]
      }
      return acc
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }, {} as Record<string, any>)

    return `${prefix}:${JSON.stringify(sortedParams)}`
  }

  /**
   * Get cached data
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      cacheMonitor.recordMiss()
      return null
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      cacheMonitor.recordMiss()
      return null
    }

    cacheMonitor.recordHit()
    return entry.data
  }

  /**
   * Set cached data
   */
  set<T>(key: string, data: T, ttl?: number): void {
    // Clean up if we're at max capacity
    if (this.cache.size >= this.maxSize) {
      this.cleanupOldest()
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    })

    cacheMonitor.updateSize(this.cache.size)
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    // Remove expired entries
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  /**
   * Clear expired entries
   */
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
        cacheMonitor.recordEviction()
      }
    }
    cacheMonitor.updateSize(this.cache.size)
  }

  /**
   * Remove oldest entry when cache is full
   */
  private cleanupOldest(): void {
    let oldestKey: string | null = null
    let oldestTimestamp = Infinity

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
      cacheMonitor.recordEviction()
    }
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear()
    cacheMonitor.updateSize(0)
  }

  /**
   * Get cache statistics
   */
  stats(): {
    size: number
    hitRate: number
    totalRequests: number
    totalHits: number
  } {
    return {
      size: this.cache.size,
      hitRate: this.totalRequests > 0 ? (this.totalHits / this.totalRequests) * 100 : 0,
      totalRequests: this.totalRequests,
      totalHits: this.totalHits,
    }
  }

  private totalRequests = 0
  private totalHits = 0

  /**
   * Track cache hit for statistics
   */
  trackHit(): void {
    this.totalHits++
    this.totalRequests++
  }

  /**
   * Track cache miss for statistics
   */
  trackMiss(): void {
    this.totalRequests++
  }
}

// Singleton instance
export const queryCache = new QueryCache()

/**
 * Video-specific cache helpers
 */
export const videoCache = {
  /**
   * Cache key for video list queries
   */
  listKey: (params: {
    page?: number
    limit?: number
    search?: string
    category?: string
    tags?: string
    cursor?: string
    random?: boolean
  }) => queryCache.generateKey('videos:list', params),

  /**
   * Cache key for video count queries
   */
  countKey: (params: {
    search?: string
    category?: string
    tags?: string
  }) => queryCache.generateKey('videos:count', params),

  /**
   * Cache key for single video queries
   */
  singleKey: (id: string) => `videos:single:${id}`,

  /**
   * Invalidate all video caches (call when new videos are added)
   */
  invalidateAll(): void {
    const keysToDelete: string[] = []

    for (const key of queryCache['cache'].keys()) {
      if (key.startsWith('videos:')) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => queryCache['cache'].delete(key))
    cacheMonitor.updateSize(queryCache['cache'].size)
  },
}

/**
 * Stream-specific cache helpers
 */
export const streamCache = {
  listKey: () => 'streams:list',
  singleKey: (id: string) => `streams:single:${id}`,

  invalidateAll(): void {
    const keysToDelete: string[] = []

    for (const key of queryCache['cache'].keys()) {
      if (key.startsWith('streams:')) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => queryCache['cache'].delete(key))
    cacheMonitor.updateSize(queryCache['cache'].size)
  },
}

// Periodic cleanup (every minute)
setInterval(() => {
  queryCache.cleanup()
}, 1000 * 60)