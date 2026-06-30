import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { removeVideoFromCache } from "@/lib/video-cache";
import { auth } from "@/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // In Next.js 15, params is a Promise and must be awaited
    const { id } = await params;

    // 1. Fetch video details and channel info
    const video = await prisma.video.findUnique({
      where: { id },
      include: {
        channel: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            ownerId: true,
          },
        },
      },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // 2. Increment video views in database asynchronously
    const updatedVideo = await prisma.video.update({
      where: { id },
      data: { views: { increment: 1 } },
    });

    return NextResponse.json({
      video: {
        ...video,
        views: updatedVideo.views, // Send back the updated view count
      },
    });
  } catch (error) {
    console.error("Fetch video details error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    // Fetch the video and check channel ownership
    const video = await prisma.video.findUnique({
      where: { id },
      include: {
        channel: {
          select: {
            ownerId: true,
          },
        },
      },
    });
    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }
    // Only the channel owner can delete the video
    if (video.channel.ownerId !== userId) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to delete this video" },
        { status: 403 }
      );
    }
    // Delete from database
    await prisma.video.delete({
      where: { id },
    });
    // Evict from our fast in-memory cache
    removeVideoFromCache(id);
    return NextResponse.json({ message: "Video deleted successfully" });
  } catch (error) {
    console.error("Delete video error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}