import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

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

    // 4. Toggle like state
    if (existingLike) {
      // User has already liked the video, so unlike it (remove Like record)
      await prisma.like.delete({
        where: {
          id: existingLike.id,
        },
      });

      // Get the updated like count for the response
      const likeCount = await prisma.like.count({ where: { videoId } });
      return NextResponse.json({ liked: false, likes: likeCount, message: "Video unliked" });
    } else {
      // User hasn't liked the video, so like it (create Like record)
      await prisma.like.create({
        data: {
          userId,
          videoId,
        },
      });

      const likeCount = await prisma.like.count({ where: { videoId } });
      return NextResponse.json({ liked: true, likes: likeCount, message: "Video liked" });
    }
  } catch (error) {
    console.error("Like toggle error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
