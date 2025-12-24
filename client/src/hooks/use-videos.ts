import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

// GET /api/videos
export function useVideos(page: number = 1, limit: number = 4) {
  return useQuery({
    queryKey: [api.videos.list.path, { page, limit }],
    queryFn: async () => {
      const url = `${api.videos.list.path}?page=${page}&limit=${limit}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch videos");
      return api.videos.list.responses[200].parse(await res.json());
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
