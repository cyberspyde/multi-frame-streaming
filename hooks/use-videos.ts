import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/routes";

interface VideoFilters {
  search?: string;
  category?: string;
  tags?: string;
  random?: boolean;
  refreshKey?: number;
}

// GET /api/videos
export function useVideos(page: number = 1, limit: number = 4, filters: VideoFilters = {}) {
  return useQuery({
    queryKey: [api.videos.list.path, { page, limit, ...filters }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (filters.search) params.append('search', filters.search);
      if (filters.category) params.append('category', filters.category);
      if (filters.tags) params.append('tags', filters.tags);
      if (filters.random) params.append('random', 'true');

      const url = `${api.videos.list.path}?${params.toString()}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch videos");
      return await res.json();
    },
    // Keep previous data while fetching new pages for smooth transitions
    placeholderData: (previousData) => previousData,
  });
}

// POST /api/videos/seed (Reset/Seed)
export function useSeedVideos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.videos.seed.path, {
        method: api.videos.seed.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to seed videos");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.videos.list.path] });
    },
  });
}

// POST /api/videos (Add single video)
export function useAddVideo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (video: { title: string; sourceUrl?: string; thumbnailUrl?: string; duration?: number; iframe?: string; tags?: string; performers?: string; streamId?: string }) => {
      const res = await fetch(api.videos.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(video),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to add video");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.videos.list.path] });
    },
  });
}

// DELETE /api/videos/seed (Clear all)
export function useClearVideos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.videos.clear.path, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to clear videos");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.videos.list.path] });
    },
  });
}

// POST /api/videos/:id/like
export function useLikeVideo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${api.videos.list.path}/${id}/like`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to like video");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.videos.list.path] });
    },
  });
}

// POST /api/videos/:id/dislike
export function useDislikeVideo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${api.videos.list.path}/${id}/dislike`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to dislike video");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.videos.list.path] });
    },
  });
}

