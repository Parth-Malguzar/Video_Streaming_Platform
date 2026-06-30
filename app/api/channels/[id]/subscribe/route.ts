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

    const channelId = (await params).id;

    // 2. Verify the channel exists
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    // 3. Prevent creators from subscribing to their own channel
    if (channel.ownerId === userId) {
      return NextResponse.json(
        { error: "You cannot subscribe to your own channel" },
        { status: 400 }
      );
    }

    // 4. Check if the subscription already exists
    const existingSubscription = await prisma.subscription.findUnique({
      where: {
        userId_channelId: {//composite key made because of @@unique[userid,channelid] by prisma
          userId,
          channelId,
        },
      },
    });

    // 5. Toggle subscription
    if (existingSubscription) {
      // Unsubscribe
      await prisma.subscription.delete({
        where: {
          id: existingSubscription.id,
        },
      });
      return NextResponse.json({ subscribed: false, message: "Unsubscribed successfully" });
    } else {
      // Subscribe
      await prisma.subscription.create({
        data: {
          userId,
          channelId,
        },
      });
      return NextResponse.json({ subscribed: true, message: "Subscribed successfully" });
    }
  } catch (error) {
    console.error("Subscription toggle error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
