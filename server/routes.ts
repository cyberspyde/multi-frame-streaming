import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

const SAMPLE_VIDEOS = [
  {
    title: "Big Buck Bunny",
    url: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    thumbnail: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Big_buck_bunny_poster_big.jpg/800px-Big_buck_bunny_poster_big.jpg",
    source: "Simulated Source A",
    duration: "9:56"
  },
  {
    title: "Elephant Dream",
    url: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    thumbnail: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Elephants_Dream_poster_big.jpg/800px-Elephants_Dream_poster_big.jpg",
    source: "Simulated Source B",
    duration: "10:53"
  },
  {
    title: "For Bigger Blazes",
    url: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    thumbnail: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerBlazes.jpg",
    source: "Simulated Source C",
    duration: "0:15"
  },
  {
    title: "For Bigger Escapes",
    url: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    thumbnail: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerEscapes.jpg",
    source: "Simulated Source A",
    duration: "0:15"
  },
  {
    title: "For Bigger Fun",
    url: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    thumbnail: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerFun.jpg",
    source: "Simulated Source B",
    duration: "1:00"
  },
  {
    title: "For Bigger Joyrides",
    url: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    thumbnail: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerJoyrides.jpg",
    source: "Simulated Source C",
    duration: "0:15"
  },
  {
    title: "For Bigger Meltdowns",
    url: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
    thumbnail: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerMeltdowns.jpg",
    source: "Simulated Source A",
    duration: "0:15"
  },
  {
    title: "Sintel",
    url: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    thumbnail: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Sintel_poster.jpg/800px-Sintel_poster.jpg",
    source: "Simulated Source B",
    duration: "14:48"
  },
  {
    title: "Subaru Outback On Street And Dirt",
    url: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
    thumbnail: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/SubaruOutbackOnStreetAndDirt.jpg",
    source: "Simulated Source C",
    duration: "9:54"
  },
  {
    title: "Tears of Steel",
    url: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    thumbnail: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Tears_of_Steel_poster.jpg/800px-Tears_of_Steel_poster.jpg",
    source: "Simulated Source A",
    duration: "12:14"
  }
];

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Seed data if empty
  const count = await storage.countVideos();
  if (count === 0) {
    console.log("Seeding simulation data...");
    for (const video of SAMPLE_VIDEOS) {
      await storage.createVideo(video);
    }
    // Duplicate them to get enough content for multiple batches
    for (const video of SAMPLE_VIDEOS) {
      await storage.createVideo({
         ...video,
         title: `${video.title} (Mirror)`,
         id: undefined // Let DB assign ID
      });
    }
  }

  app.get(api.videos.list.path, async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 4;
    const videos = await storage.getVideos(page, limit);
    res.json(videos);
  });

  app.post(api.videos.seed.path, async (req, res) => {
    await storage.clearVideos();
    for (const video of SAMPLE_VIDEOS) {
      await storage.createVideo(video);
    }
    res.status(201).json({ message: "Seeded", count: SAMPLE_VIDEOS.length });
  });

  return httpServer;
}
