import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { io } from "socket.io-client";

export async function GET(request: Request) {
  try {
    const now = new Date();

    // 1. Find all scheduled premieres whose launch time is reached or past, but are not yet published
    const premieresToPublish = await prisma.video.findMany({
      where: {
        isPremiere: true,
        isPublished: false,
        scheduledFor: {
          lte: now,
        },
      },
      select: {
        id: true,
        title: true,
      },
    });

    if (premieresToPublish.length === 0) {
      return NextResponse.json({
        message: "No scheduled premieres due for publication.",
        publishedCount: 0,
      });
    }

    const videoIds = premieresToPublish.map((v) => v.id);

    // 2. Update their status to published
    await prisma.video.updateMany({
      where: {
        id: {
          in: videoIds,
        },
      },
      data: {
        isPublished: true,
      },
    });

    // 3. Connect to WebSocket server and notify clients
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001";
    const socket = io(wsUrl);

    socket.on("connect", () => {
      for (const videoId of videoIds) {
        socket.emit("trigger_premiere_live", { videoId });
      }
      socket.disconnect();
    });

    socket.on("connect_error", (err) => {
      console.error("Failed to connect to WebSocket server from cron:", err.message);
    });

    return NextResponse.json({
      message: `Successfully published ${premieresToPublish.length} premiere(s).`,
      publishedVideos: premieresToPublish,
    });
  } catch (error) {
    console.error("Error in premieres cron handler:", error);
    return NextResponse.json(
      { error: "Internal server error during premiere automation." },
      { status: 500 }
    );
  }
}

export const POST = GET;
