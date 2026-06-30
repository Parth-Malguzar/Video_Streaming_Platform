import { dll, node } from "./data-structures/ll";
import { Video } from "@prisma/client";
import { prisma } from "./prisma";

// The maximum number of videos we want to hold in our fast memory cache
const MAX_CACHE_SIZE = 5;

// Initialize our custom Doubly Linked List as our 'auroraVideoIndex'
export const auroraVideoIndex = new dll<Video>();

// An O(1) Lookup Map: videoId -> Doubly LinkedList Node
const nodeMap = new Map<string, node<Video>>();

export function addVideoToCache(video: Video) {
  // If the video already exists in the cache, remove the old node first
  if (nodeMap.has(video.id)) {
    removeVideoFromCache(video.id);
  }

  // Prepend to the head of the DLL (newest first)
  const newNode = auroraVideoIndex.prepend(video);
  nodeMap.set(video.id, newNode);

  // Eviction policy: If cache exceeds limit, remove the oldest video (from the tail)
  if (auroraVideoIndex.getSize() > MAX_CACHE_SIZE) {
    const oldestNode = auroraVideoIndex.tail;
    if (oldestNode) {
      nodeMap.delete(oldestNode.value.id);
      auroraVideoIndex.remove(oldestNode);
    }
  }
}

export function removeVideoFromCache(videoId: string) {
  const nodeToRemove = nodeMap.get(videoId);
  if (nodeToRemove) {
    auroraVideoIndex.remove(nodeToRemove);
    nodeMap.delete(videoId);
  }
}

 //Pulls the 5 most recent published videos.
 
export async function getCachedVideos(): Promise<Video[]> {
  // If cache is empty, warm it up from the database
  if (auroraVideoIndex.getSize() === 0) {
    console.log("Cache miss! Warming up auroraVideoIndex cache from database...");
    
    const recentVideos = await prisma.video.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: "desc" },
      take: MAX_CACHE_SIZE,
    });

    // Populate our cache (add from oldest to newest so the newest ends up at the head)
    for (let i = recentVideos.length - 1; i >= 0; i--) {
      addVideoToCache(recentVideos[i]);
    }
  }

  // Convert DLL nodes back to an array for easy JSON serialization
  return auroraVideoIndex.toArray();
}
