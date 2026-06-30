import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import WatchPageContainer from "./WatchPageContainer";

interface WatchPageProps {
  params: Promise<{ id: string }>;
}

export default async function WatchPage({ params }: WatchPageProps) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  // 1. Fetch current video details and increment its views counter
  let video;
  try {
    video = await prisma.video.update({
      where: { id },
      data: { views: { increment: 1 } },
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
  } catch (error) {
    console.error("Failed to load video:", error);
    return notFound();
  }

  if (!video) {
    return notFound();
  }

  // 2. Fetch authenticated user from NextAuth session
  const session = await auth();
  const user = session?.user;
  const currentUser = user
    ? {
        userId: user.id,
        username: user.username || user.name || user.email?.split("@")[0] || "User",
        email: user.email || "",
      }
    : null;

  // 3. Check if user is already a member of this channel
  let isMember = false;
  if (currentUser) {
    const membership = await prisma.membership.findUnique({
      where: {
        userId_channelId: {
          userId: currentUser.userId,
          channelId: video.channel.id,
        },
      },
    });
    if (membership && membership.expiresAt > new Date()) {
      isMember = true;
    }
  }

  // 4. Fetch likes count and check if user has liked
  const likesCount = await prisma.like.count({
    where: { videoId: id },
  });

  let hasLiked = false;
  if (currentUser) {
    const likeRecord = await prisma.like.findUnique({
      where: {
        userId_videoId: {
          userId: currentUser.userId,
          videoId: id,
        },
      },
    });
    if (likeRecord) {
      hasLiked = true;
    }
  }

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
      <WatchPageContainer
        video={video}
        currentUser={currentUser}
        isMemberInitial={isMember}
        likesCountInitial={likesCount}
        hasLikedInitial={hasLiked}
      />
    </main>
  );
}
