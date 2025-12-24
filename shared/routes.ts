import { z } from 'zod';
import { videoSchema, videosListResponseSchema, streamSchema, createVideoSchema, createStreamSchema } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  videos: {
    list: {
      method: 'GET' as const,
      path: '/api/videos',
      input: z.object({
        page: z.coerce.number().optional(),
        limit: z.coerce.number().optional(),
      }).optional(),
      responses: {
        200: videosListResponseSchema,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/videos',
      input: createVideoSchema,
      responses: {
        201: videoSchema,
      },
    },
    seed: { // Helper to reset/seed simulation data
      method: 'POST' as const,
      path: '/api/videos/seed',
      responses: {
        201: z.object({ message: z.string(), count: z.number() }),
      },
    },
    clear: {
      method: 'DELETE' as const,
      path: '/api/videos/seed',
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
  },
  streams: {
    list: {
      method: 'GET' as const,
      path: '/api/streams',
      responses: {
        200: z.array(streamSchema),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/streams',
      input: createStreamSchema,
      responses: {
        201: streamSchema,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type VideoListResponse = z.infer<typeof api.videos.list.responses[200]>;
