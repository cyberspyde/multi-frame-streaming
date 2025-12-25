-- Production Index Creation Script
-- Use this script for zero-downtime deployment on production
-- Run these commands directly in psql or your database client
-- This script uses CONCURRENTLY to avoid table locks

-- Connect to your database first:
-- psql -h localhost -U postgres -d multi_frame_streaming

-- Basic indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_videos_created_at_desc ON videos (created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_videos_title ON videos (title);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_videos_category ON videos (category);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_videos_tags ON videos (tags);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_videos_performers ON videos (performers);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_videos_views_desc ON videos (views DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_videos_likes_desc ON videos (likes DESC);

-- Composite indexes for filtered searches
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_videos_category_created_at_desc ON videos (category, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_videos_tags_created_at_desc ON videos (tags, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_videos_performers_created_at_desc ON videos (performers, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_videos_views_created_at_desc ON videos (views DESC, created_at DESC);

-- Index for stream relations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_videos_stream_id ON videos (stream_id);

-- Covering index for common video list queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_videos_list_covering ON videos 
(created_at DESC, id, title, source_url, thumbnail_url, duration, category, tags, performers, views, likes, stream_id);

-- Full-text search index (optional, for advanced search)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_videos_fts ON videos 
-- USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(tags, '') || ' ' || coalesce(performers, '')));

-- Verification: Check if indexes were created
-- \d videos

-- Notes:
-- 1. CONCURRENTLY takes longer but doesn't lock the table
-- 2. Run during low-traffic periods
-- 3. Each index creation may take several minutes on 6M+ records
-- 4. If any command fails, it won't affect others
-- 5. Monitor progress with: SELECT * FROM pg_stat_progress_create_index;