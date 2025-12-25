import { z } from "zod";

export const videoSchema = z.object({
  id: z.string(),
  title: z.string(),
  sourceUrl: z.string().nullable(),
  thumbnailUrl: z.string(),
  duration: z.number().nullable(),
  likes: z.number(),
  dislikes: z.number(),
  category: z.string().nullable(),
  iframe: z.string().nullable(),
  tags: z.string().nullable(),
  performers: z.string().nullable(),
  streamId: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  stream: z.object({
    id: z.string(),
    name: z.string(),
    source: z.string(),
    query: z.string(),
    lastPulled: z.coerce.date().nullable(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
  }).nullable(),
});

export const streamSchema = z.object({
  id: z.string(),
  name: z.string(),
  source: z.string(),
  query: z.string(),
  lastPulled: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  _count: z.object({
    videos: z.number(),
  }).optional(),
});

export const createVideoSchema = z.object({
  title: z.string().min(1),
  sourceUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
  duration: z.number().optional(),
  iframe: z.string().optional(),
  tags: z.string().optional(),
  performers: z.string().optional(),
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
    total: z.number().optional(),
    pages: z.number().optional(),
    hasNextPage: z.boolean(),
    nextCursor: z.string().nullable().optional(),
  }),
});

export type Video = z.infer<typeof videoSchema>;
export type Stream = z.infer<typeof streamSchema>;
export type CreateVideoRequest = z.infer<typeof createVideoSchema>;
export type CreateStreamRequest = z.infer<typeof createStreamSchema>;
export type VideosListResponse = z.infer<typeof videosListResponseSchema>;
