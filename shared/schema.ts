import { z } from "zod";

export const videoSchema = z.object({
  id: z.string(),
  title: z.string(),
  sourceUrl: z.string(),
  thumbnailUrl: z.string(),
  duration: z.number().nullable(),
  filePath: z.string().nullable(),
  compressed: z.boolean(),
  likes: z.number(),
  dislikes: z.number(),
  category: z.string().nullable(),
  streamId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  stream: z.object({
    id: z.string(),
    name: z.string(),
    source: z.string(),
    query: z.string(),
    lastPulled: z.date().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
  }).nullable(),
});

export const streamSchema = z.object({
  id: z.string(),
  name: z.string(),
  source: z.string(),
  query: z.string(),
  lastPulled: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  _count: z.object({
    videos: z.number(),
  }).optional(),
});

export const createVideoSchema = z.object({
  title: z.string().min(1),
  sourceUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  duration: z.number().optional(),
  streamId: z.string().optional(),
});

export const createStreamSchema = z.object({
  name: z.string().min(1),
  source: z.string().min(1),
  query: z.string().min(1),
});

export const videosListResponseSchema = z.object({
  videos: z.array(videoSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    pages: z.number(),
  }),
});

export type Video = z.infer<typeof videoSchema>;
export type Stream = z.infer<typeof streamSchema>;
export type CreateVideoRequest = z.infer<typeof createVideoSchema>;
export type CreateStreamRequest = z.infer<typeof createStreamSchema>;
export type VideosListResponse = z.infer<typeof videosListResponseSchema>;
