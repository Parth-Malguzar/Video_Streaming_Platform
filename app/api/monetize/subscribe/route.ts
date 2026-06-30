import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { channelId, isProUpgrade } = await request.json();

    if (isProUpgrade) {
      // Site-wide Pro upgrade
      const updatedUser = await prisma.user.update({
        where: { id: session.user.id },
        data: {
          isPro: true,
          proExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      });
      return NextResponse.json({ message: "Successfully upgraded to PRO", user: updatedUser });
    }

    if (!channelId) {
      return NextResponse.json({ error: "channelId is required for memberships" }, { status: 400 });
    }

    // Toggle channel membership
    const existingMembership = await prisma.membership.findUnique({
      where: {
        userId_channelId: {
          userId: session.user.id,
          channelId,
        },
      },
    });

    if (existingMembership) {
      // Unsubscribe / Cancel membership
      await prisma.membership.delete({
        where: {
          id: existingMembership.id,
        },
      });
      return NextResponse.json({ active: false, message: "Successfully cancelled channel membership" });
    } else {
      // Subscribe
      const membership = await prisma.membership.create({
        data: {
          userId: session.user.id,
          channelId,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      });
      return NextResponse.json({ active: true, message: "Successfully subscribed to channel membership", membership });
    }
  } catch (error) {
    console.error("Monetize subscription error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
