import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { io } from "socket.io-client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const videoId = (await params).id;

    // 1. Verify the video exists
    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // 2. Fetch all comments for this video, including user details
    const comments = await prisma.comment.findMany({
      where: { videoId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error("Fetch comments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Enforce authentication
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const videoId = (await params).id;
    const { content, parentId } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Comment content cannot be empty" }, { status: 400 });
    }

    // 2. Verify the video exists
    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // If parentId is provided, verify the parent comment exists and is on the same video
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
      });
      if (!parentComment || parentComment.videoId !== videoId) {
        return NextResponse.json({ error: "Parent comment not found" }, { status: 404 });
      }
    }

    // 3. Create the comment
    const newComment = await prisma.comment.create({
      data: {
        content: content.trim(),
        userId,
        videoId,
        parentId: parentId || null,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
      },
    });

    // 4. If it is a reply, create a notification and send real-time socket event
    if (parentId) {
      try {
        const parentComment = await prisma.comment.findUnique({
          where: { id: parentId },
        });

        if (parentComment && parentComment.userId !== userId) {
          const notification = await prisma.notification.create({
            data: {
              userId: parentComment.userId,
              senderId: userId,
              type: "REPLY",
              videoId,
              commentId: newComment.id,
            },
            include: {
              sender: {
                select: {
                  username: true,
                  name: true,
                },
              },
            },
          });

          // Send real-time socket notification
          const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001";
          const socket = io(wsUrl);
          socket.on("connect", () => {
            socket.emit("notification_sent", {
              userId: parentComment.userId,
              notification,
            });
            socket.disconnect();
          });
        }
      } catch (notifErr) {
        console.error("Failed to create/send reply notification:", notifErr);
      }
    }

    // 5. Notify WebSocket server of new comment
    try {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001";
      const socket = io(wsUrl);
      socket.on("connect", () => {
        socket.emit("comment_posted", { videoId, comment: newComment });
        socket.disconnect();
      });
    } catch (wsErr) {
      console.error("Failed to notify socket server of comment update:", wsErr);
    }

    return NextResponse.json(
      { message: "Comment posted successfully", comment: newComment },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create comment error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
