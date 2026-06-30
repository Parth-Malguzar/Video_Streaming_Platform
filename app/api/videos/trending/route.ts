import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TreeMap } from "@/lib/data-structures/TreeMap";
import { Video } from "@prisma/client";

type VideoWithChannel = Video & {
  channel: {
    id: string;
    name: string;
    logoUrl: string | null;
  };
};

export async function GET() {
  try {
    // 1. Fetch published videos from database, including channel metadata
    const videos = await prisma.video.findMany({
      where: {
        isPublished: true,
      },
      include: {
        channel: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
      },
    });

    // 2. Initialize our custom TreeMap sorting algorithm
    const treeMap = new TreeMap<number, VideoWithChannel>();

    // 3. Insert all videos into the TreeMap using view count as the key
    for (const video of videos) {
      treeMap.insert(video.views, video);
    }

    // 4. Retrieve videos sorted in descending order of view counts (highest views first)
    const sortedVideos = treeMap.getValuesDescending();

    return NextResponse.json({
      videos: sortedVideos,
      count: sortedVideos.length,
    });
  } catch (error) {
    console.error("Fetch trending videos error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
