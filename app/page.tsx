import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getRelativeTime } from "@/lib/kronos-helper";
import { Prisma } from "@prisma/client";

interface PageProps {
  searchParams: Promise<{ search?: string; channelId?: string }>;
}

export default async function Home({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const search = resolvedParams.search || "";
  const channelId = resolvedParams.channelId || "";

  // Construct query where clause: show published videos or upcoming premieres
  const whereClause: Prisma.VideoWhereInput = {
    OR: [
      { isPublished: true },
      { isPremiere: true }
    ]
  };

  if (search) {
    const searchTerms = [search];
    const trimmed = search.replace(/s+$/i, "");
    if (trimmed && trimmed.length > 2 && trimmed.toLowerCase() !== search.toLowerCase()) {
      searchTerms.push(trimmed);
    }
    whereClause.AND = [
      {
        OR: searchTerms.flatMap((term) => [
          { title: { contains: term, mode: "insensitive" } },
          { description: { contains: term, mode: "insensitive" } },
        ])
      }
    ];
  }

  if (channelId) {
    whereClause.channelId = channelId;
  }

  // Fetch videos from DB
  const videos = await prisma.video.findMany({
    where: whereClause,
    include: {
      channel: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
      {/* Search status or title */}
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-white">
          {search ? `Search results for "${search}"` : "Recommended"}
        </h1>
        {videos.length === 0 && (
          <p className="text-[#a3a3a3] mt-2 text-sm">No videos found matching your request.</p>
        )}
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {videos.map((video) => (
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
              {video.isPremiere && (
                <span className="absolute bottom-2 right-2 bg-red-600 text-white font-semibold text-[10px] px-1.5 py-0.5 rounded uppercase">
                  Premiere
                </span>
              )}
            </Link>

            {/* Video Details */}
            <div className="flex gap-3">
              {/* Channel Logo */}
              <div className="w-9 h-9 rounded-full overflow-hidden bg-[#262626] shrink-0">
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
                  <span>{video.views.toLocaleString()} views</span>
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
