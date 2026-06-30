import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { io } from "socket.io-client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Get authenticated user
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const videoId = (await params).id;

    // 2. Verify the video exists
    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // 3. Check if the like already exists
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_videoId: {
          userId,
          videoId,
        },
      },
    });

    let likedState = false;
    let likeCount = 0;

    // 4. Toggle like state
    if (existingLike) {
      // User has already liked the video, so unlike it (remove Like record)
      await prisma.like.delete({
        where: {
          id: existingLike.id,
        },
      });

      // Get the updated like count for the response
      likeCount = await prisma.like.count({ where: { videoId } });
      likedState = false;
    } else {
      // User hasn't liked the video, so like it (create Like record)
      await prisma.like.create({
        data: {
          userId,
          videoId,
        },
      });

      likeCount = await prisma.like.count({ where: { videoId } });
      likedState = true;
    }

    // 5. Notify WebSocket server of updated likes
    try {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
      const socket = io(wsUrl);
      socket.on("connect", () => {
        socket.emit("like_updated", { videoId, likes: likeCount });
        socket.disconnect();
      });
    } catch (wsErr) {
      console.error("Failed to notify socket server of like update:", wsErr);
    }

    return NextResponse.json({
      liked: likedState,
      likes: likeCount,
      message: likedState ? "Video liked" : "Video unliked"
    });
  } catch (error) {
    console.error("Like toggle error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
