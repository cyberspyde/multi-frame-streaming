import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { videoCache } from '@/lib/query-cache'

const SAMPLE_VIDEOS = [
  {
    title: "Big Buck Bunny",
    sourceUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    thumbnailUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Big_buck_bunny_poster_big.jpg/800px-Big_buck_bunny_poster_big.jpg",
    duration: 596
  },
  {
    title: "Elephant Dream",
    sourceUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    thumbnailUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Elephants_Dream_poster_big.jpg/800px-Elephants_Dream_poster_big.jpg",
    duration: 654
  },
  {
    title: "For Bigger Blazes",
    sourceUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    thumbnailUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerBlazes.jpg",
    duration: 15
  },
  {
    title: "For Bigger Escapes",
    sourceUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    thumbnailUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerEscapes.jpg",
    duration: 15
  },
  {
    title: "For Bigger Fun",
    sourceUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    thumbnailUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerFun.jpg",
    duration: 60
  },
  {
    title: "For Bigger Joyrides",
    sourceUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    thumbnailUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerJoyrides.jpg",
    duration: 15
  },
  {
    title: "For Bigger Meltdowns",
    sourceUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
    thumbnailUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerMeltdowns.jpg",
    duration: 15
  },
  {
    title: "Sintel",
    sourceUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    thumbnailUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Sintel_poster.jpg/800px-Sintel_poster.jpg",
    duration: 888
  },
  {
    title: "Subaru Outback On Street And Dirt",
    sourceUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
    thumbnailUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/SubaruOutbackOnStreetAndDirt.jpg",
    duration: 594
  },
  {
    title: "Tears of Steel",
    sourceUrl: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    thumbnailUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Tears_of_Steel_poster.jpg/800px-Tears_of_Steel_poster.jpg",
    duration: 734
  }
];

export async function POST() {
  try {
    await prisma.video.deleteMany();

    const videos = await prisma.$transaction(
      SAMPLE_VIDEOS.map(video => prisma.video.create({ data: video }))
    );

    // Invalidate all video caches after seeding
    videoCache.invalidateAll()

    return NextResponse.json({ message: "Seeded", count: videos.length }, { status: 201 });
  } catch (error) {
    console.error('Error seeding videos:', error);
    return NextResponse.json({ error: 'Failed to seed videos' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await prisma.video.deleteMany();
    
    // Invalidate all video caches after clearing
    videoCache.invalidateAll()
    
    return NextResponse.json({ message: "Dashboard cleared" });
  } catch (error) {
    console.error('Error clearing videos:', error);
    return NextResponse.json({ error: 'Failed to clear videos' }, { status: 500 });
  }
}