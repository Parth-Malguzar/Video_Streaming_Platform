import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import StudioClient from "./StudioClient";

export default async function StudioPage() {
  // 1. Authenticate user from NextAuth session
  const session = await auth();
  const user = session?.user;

  if (!user) {
    // Redirect to login if session is missing
    redirect("/login?callbackUrl=/studio");
  }

  const currentUser = {
    userId: user.id,
    username: user.username || user.name || user.email?.split("@")[0] || "User",
    email: user.email || "",
  };

  // 2. Fetch the user's owned channels
  const channels = await prisma.channel.findMany({
    where: {
      ownerId: currentUser.userId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  return (
    <main className="flex-1 px-4 py-6">
      <StudioClient initialChannels={channels} currentUser={currentUser} />
    </main>
  );
}
