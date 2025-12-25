-- DropIndex
DROP INDEX "idx_videos_list_covering";

-- DropIndex
DROP INDEX "idx_videos_stream_id";

-- RenameIndex
ALTER INDEX "idx_videos_category" RENAME TO "videos_category_idx";

-- RenameIndex
ALTER INDEX "idx_videos_category_created_at_desc" RENAME TO "videos_category_created_at_idx";

-- RenameIndex
ALTER INDEX "idx_videos_created_at_desc" RENAME TO "videos_created_at_idx";

-- RenameIndex
ALTER INDEX "idx_videos_likes_desc" RENAME TO "videos_likes_idx";

-- RenameIndex
ALTER INDEX "idx_videos_performers" RENAME TO "videos_performers_idx";

-- RenameIndex
ALTER INDEX "idx_videos_performers_created_at_desc" RENAME TO "videos_performers_created_at_idx";

-- RenameIndex
ALTER INDEX "idx_videos_tags" RENAME TO "videos_tags_idx";

-- RenameIndex
ALTER INDEX "idx_videos_tags_created_at_desc" RENAME TO "videos_tags_created_at_idx";

-- RenameIndex
ALTER INDEX "idx_videos_title" RENAME TO "videos_title_idx";

-- RenameIndex
ALTER INDEX "idx_videos_views_created_at_desc" RENAME TO "videos_views_created_at_idx";

-- RenameIndex
ALTER INDEX "idx_videos_views_desc" RENAME TO "videos_views_idx";
