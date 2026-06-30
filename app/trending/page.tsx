import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getRelativeTime } from "@/lib/kronos-helper";
import { TreeMap } from "@/lib/data-structures/TreeMap";

export default async function TrendingPage() {
  // 1. Fetch published videos
  const videos = await prisma.video.findMany({
    where: { isPublished: true },
    include: {
      channel: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
        },
      },
    },
  });

  // 2. Initialize TreeMap and sort
  const treeMap = new TreeMap<number, typeof videos[0]>();
  for (const video of videos) {
    treeMap.insert(video.views, video);
  }

  const sortedVideos = treeMap.getValuesDescending();

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
      {/* Title */}
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          🔥 Trending Videos
        </h1>
        <p className="text-[#a3a3a3] text-sm mt-1">The most viewed videos on DTube right now.</p>
        {sortedVideos.length === 0 && (
          <p className="text-[#a3a3a3] mt-2 text-sm">No trending videos available yet.</p>
        )}
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {sortedVideos.map((video) => (
          <article key={video.id} className="group flex flex-col gap-2">
            {/* Thumbnail */}
            <Link href={`/watch/${video.id}`} className="aspect-video w-full rounded-lg overflow-hidden bg-[#141414] border border-[#262626] relative block">
              {video.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">
                  No Thumbnail
                </div>
              )}
            </Link>

            {/* Video Details */}
            <div className="flex gap-3">
              {/* Channel Logo */}
              <div className="w-9 h-9 rounded-full overflow-hidden bg-[#262626] flex-shrink-0">
                {video.channel.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={video.channel.logoUrl}
                    alt={video.channel.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold text-sm">
                    {video.channel.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Text Info */}
              <div className="flex flex-col gap-0.5 min-w-0">
                <Link href={`/watch/${video.id}`} className="text-sm font-semibold text-white leading-tight line-clamp-2 hover:text-[#ef4444] transition">
                  {video.title}
                </Link>
                <Link href={`/?channelId=${video.channel.id}`} className="text-xs text-[#a3a3a3] hover:text-white transition mt-1 truncate">
                  {video.channel.name}
                </Link>
                <div className="text-[11px] text-[#a3a3a3] flex items-center gap-1.5 mt-0.5">
                  <span className="text-[#ef4444] font-semibold">{video.views.toLocaleString()} views</span>
                  <span>•</span>
                  <span>{getRelativeTime(video.createdAt)}</span>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
