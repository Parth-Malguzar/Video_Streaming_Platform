import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCachedVideos } from "@/lib/video-cache";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const channelId = searchParams.get("channelId") || "";

    // 1. CACHE HIT: If no search query or channel filtering is requested, serve from the in-memory Cache!
    if (!search && !channelId) {
      const cachedVideos = await getCachedVideos();
      return NextResponse.json({ videos: cachedVideos, source: "cache" });
    }

    // 2. CACHE BYPASS: If search parameters are provided, perform a standard PostgreSQL query
    const whereClause: Prisma.VideoWhereInput = {
      isPublished: true,
      isPremiere: false, // Don't show un-premiered scheduled videos in search results
    };

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (channelId) {
      whereClause.channelId = channelId;
    }

    const videos = await prisma.video.findMany({
      where: whereClause,
      include: {//join or populate
        channel: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ videos, source: "database" });
  } catch (error) {
    console.error("Fetch videos error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
