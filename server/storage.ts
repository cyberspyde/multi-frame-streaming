import { db } from "./db";
import { videos, type Video, type InsertVideo } from "@shared/schema";
import { count, desc } from "drizzle-orm";

export interface IStorage {
  getVideos(page: number, limit: number): Promise<Video[]>;
  createVideo(video: InsertVideo): Promise<Video>;
  countVideos(): Promise<number>;
  clearVideos(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getVideos(page: number, limit: number): Promise<Video[]> {
    const offset = (page - 1) * limit;
    return await db.select()
      .from(videos)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(videos.id));
  }

  async createVideo(video: InsertVideo): Promise<Video> {
    const [newVideo] = await db.insert(videos).values(video).returning();
    return newVideo;
  }

  async countVideos(): Promise<number> {
    const [result] = await db.select({ count: count() }).from(videos);
    return result.count;
  }

  async clearVideos(): Promise<void> {
    await db.delete(videos);
  }
}

export const storage = new DatabaseStorage();
