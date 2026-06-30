import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized: Admins only" }, { status: 403 });
    }

    const { userId, videoId, reason } = await request.json();
    if (!userId || !reason) {
      return NextResponse.json({ error: "userId and reason are required" }, { status: 400 });
    }

    // 1. Create the strike
    const strike = await prisma.strike.create({
      data: {
        userId,
        videoId: videoId || null,
        reason,
      },
    });

    // 2. Count total strikes for this user
    const strikeCount = await prisma.strike.count({
      where: { userId },
    });

    let banned = false;
    // 3. If 3 or more strikes, ban the user and their channels
    if (strikeCount >= 3) {
      banned = true;
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { isBanned: true },
        }),
        prisma.channel.updateMany({
          where: { ownerId: userId },
          data: { isBanned: true },
        }),
      ]);
    }

    return NextResponse.json({
      message: `Strike issued successfully. User has ${strikeCount} strike(s).`,
      strike,
      banned,
    });
  } catch (error) {
    console.error("Strike creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
