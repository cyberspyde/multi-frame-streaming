-- CreateTable
CREATE TABLE "streams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "last_pulled" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "streams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "videos" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "source_url" TEXT,
    "thumbnail_url" TEXT NOT NULL,
    "duration" INTEGER,
    "file_path" TEXT,
    "compressed" BOOLEAN NOT NULL DEFAULT false,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "dislikes" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT,
    "iframe" TEXT,
    "tags" TEXT,
    "performers" TEXT,
    "quality" TEXT,
    "uploader" TEXT,
    "publish_date" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "stream_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "id" TEXT NOT NULL,
    "compression_level" TEXT NOT NULL DEFAULT '720p',
    "bitrate" TEXT NOT NULL DEFAULT '1500k',
    "multi_view_layout" INTEGER NOT NULL DEFAULT 4,
    "auto_pull_frequency" INTEGER NOT NULL DEFAULT 24,
    "like_threshold" INTEGER NOT NULL DEFAULT 5,
    "dislike_threshold" INTEGER NOT NULL DEFAULT 3,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "videos" ADD CONSTRAINT "videos_stream_id_fkey" FOREIGN KEY ("stream_id") REFERENCES "streams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
