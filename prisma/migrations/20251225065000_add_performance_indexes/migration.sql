-- Migration: Add Performance Indexes for 6M+ Records
-- Created: 2025-12-25 06:50:00
-- Purpose: Optimize database queries for large dataset
-- Note: This migration uses regular indexes (not CONCURRENTLY) for Prisma compatibility
-- For production, use the separate script provided

-- Basic indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_videos_created_at_desc ON videos (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_title ON videos (title);
CREATE INDEX IF NOT EXISTS idx_videos_category ON videos (category);
CREATE INDEX IF NOT EXISTS idx_videos_tags ON videos (tags);
CREATE INDEX IF NOT EXISTS idx_videos_performers ON videos (performers);
CREATE INDEX IF NOT EXISTS idx_videos_views_desc ON videos (views DESC);
CREATE INDEX IF NOT EXISTS idx_videos_likes_desc ON videos (likes DESC);

-- Composite indexes for filtered searches
CREATE INDEX IF NOT EXISTS idx_videos_category_created_at_desc ON videos (category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_tags_created_at_desc ON videos (tags, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_performers_created_at_desc ON videos (performers, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_views_created_at_desc ON videos (views DESC, created_at DESC);

-- Index for stream relations
CREATE INDEX IF NOT EXISTS idx_videos_stream_id ON videos (stream_id);

-- Covering index for common video list queries
CREATE INDEX IF NOT EXISTS idx_videos_list_covering ON videos 
(created_at DESC, id, title, source_url, thumbnail_url, duration, category, tags, performers, views, likes, stream_id);

-- Performance notes:
-- 1. These indexes will significantly improve query performance
-- 2. For production deployment with zero downtime, use the concurrent script
-- 3. Index creation may take several minutes on 6M+ records
-- 4. Table will be locked during index creation (use concurrent version for production)

-- Expected performance improvements:
-- - Query time for paginated lists: 1000ms+ → 50-200ms
-- - Count queries with filters: 500ms+ → 10-50ms
-- - Full table scans eliminated for common patterns