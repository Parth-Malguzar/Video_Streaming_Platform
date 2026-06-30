import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    // 1. Get the authenticated user ID from headers (injected by proxy)
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description, logoUrl, bannerUrl } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "Channel name is required" }, { status: 400 });
    }

    // 2. Check if a channel with this name already exists
    const existingChannel = await prisma.channel.findUnique({
      where: { name: name.trim() },
    });

    if (existingChannel) {
      return NextResponse.json(
        { error: "A channel with this name already exists" },
        { status: 409 }
      );
    }

    // 3. Create the channel for this user
    const newChannel = await prisma.channel.create({
      data: {
        name: name.trim(),
        description: description?.trim() || "",
        logoUrl: logoUrl || null,
        bannerUrl: bannerUrl || null,
        ownerId: userId,
      },
    });

    return NextResponse.json(
      {
        message: "Channel created successfully",
        channel: newChannel,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Channel creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
