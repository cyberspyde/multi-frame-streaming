import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  thumbnail: text("thumbnail").notNull(),
  source: text("source").notNull(), // e.g., 'Simulation', 'Source A'
  duration: text("duration"),
});

export const insertVideoSchema = createInsertSchema(videos).omit({ id: true });

export type Video = typeof videos.$inferSelect;
export type InsertVideo = z.infer<typeof insertVideoSchema>;

// Request types
export type CreateVideoRequest = InsertVideo;

// Response types
export type VideoResponse = Video;
export type VideoListResponse = Video[];

export interface VideoQueryParams {
  page?: number;
  limit?: number;
}
