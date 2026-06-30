import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addVideoToCache } from "@/lib/video-cache";

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channelId");

    let whereClause: any = {};
    if (channelId) {
      // Verify channel ownership
      const channel = await prisma.channel.findFirst({
        where: { id: channelId, ownerId: userId },
      });
      if (!channel) {
        return NextResponse.json({ error: "Forbidden: You do not own this channel" }, { status: 403 });
      }
      whereClause.channelId = channelId;
    } else {
      // Fetch all channels owned by user
      const ownedChannels = await prisma.channel.findMany({
        where: { ownerId: userId },
        select: { id: true },
      });
      const channelIds = ownedChannels.map((c) => c.id);
      whereClause.channelId = { in: channelIds };
    }

    const videos = await prisma.video.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ videos });
  } catch (error) {
    console.error("Fetch studio videos error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, description, videoUrl, thumbnailUrl, channelId, isPremiere, scheduledFor } = await request.json();

    // 1. Validation
    if (!title || !videoUrl || !channelId) {
      return NextResponse.json(
        { error: "Missing required fields: title, videoUrl, channelId" },
        { status: 400 }
      );
    }

    // 2. Verify channel ownership
    const channel = await prisma.channel.findFirst({
      where: {
        id: channelId,
        ownerId: userId,
      },
    });

    if (!channel) {
      return NextResponse.json(
        { error: "Forbidden: You do not own this channel or the channel does not exist" },
        { status: 403 }
      );
    }

    if (channel.isBanned) {
      return NextResponse.json(
        { error: "Forbidden: This channel has been banned and cannot publish new videos" },
        { status: 403 }
      );
    }

    // 3. Create video record in PostgreSQL
    const newVideo = await prisma.video.create({
      data: {
        title: title.trim(),
        description: description?.trim() || "",
        videoUrl,
        thumbnailUrl: thumbnailUrl || null,
        channelId,
        isPremiere: !!isPremiere,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      },
    });

    // 4. Update the in-memory Cache (O(1) Prepend)
    if (newVideo.isPublished && !newVideo.isPremiere) {
      addVideoToCache(newVideo);
    }

    return NextResponse.json(
      {
        message: "Video created successfully",
        video: newVideo,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Video creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
