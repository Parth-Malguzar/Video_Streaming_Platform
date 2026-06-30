"use client";

import { useRef, useState, useEffect } from "react";
import CommentsSection from "@/app/components/CommentsSection";
import WatchPartyPanel from "@/app/components/WatchPartyPanel";
import { io } from "socket.io-client";

interface WatchPageContainerProps {
  video: {
    id: string;
    title: string;
    description: string | null;
    videoUrl: string;
    thumbnailUrl: string | null;
    views: number;
    isPremiere: boolean;
    scheduledFor: Date | string | null;
    createdAt: Date;
    channel: {
      id: string;
      name: string;
      logoUrl: string | null;
      ownerId: string;
    };
  };
  currentUser: {
    userId: string;
    username: string;
    email: string;
  } | null;
  isMemberInitial?: boolean;
  likesCountInitial?: number;
  hasLikedInitial?: boolean;
}

export default function WatchPageContainer({
  video,
  currentUser,
  isMemberInitial = false,
  likesCountInitial = 0,
  hasLikedInitial = false,
}: WatchPageContainerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isMember, setIsMember] = useState(isMemberInitial);
  const [likesCount, setLikesCount] = useState(likesCountInitial);
  const [hasLiked, setHasLiked] = useState(hasLikedInitial);

  const [isLive, setIsLive] = useState(
    !video.isPremiere || 
    !video.scheduledFor || 
    new Date(video.scheduledFor).getTime() <= Date.now()
  );

  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // 1. WebSocket premiere went live event listener
  useEffect(() => {
    if (isLive) return;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    const socket = io(wsUrl);

    // Join the room for real-time messaging and events
    socket.emit("join_room", { roomId: video.id, username: currentUser?.username || "Guest" });

    socket.on("premiere_live", () => {
      console.log("Premiere went live!");
      setIsLive(true);
    });

    return () => {
      socket.disconnect();
    };
  }, [isLive, video.id, currentUser?.username]);

  // 2. Local countdown timer interval
  useEffect(() => {
    if (isLive || !video.scheduledFor) return;

    const targetTime = new Date(video.scheduledFor).getTime();

    const updateCountdown = () => {
      const difference = targetTime - Date.now();

      if (difference <= 0) {
        setIsLive(true);
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [isLive, video.scheduledFor]);

  const handleJoinMembership = async () => {
    if (!currentUser) {
      alert("Please sign in to join channel membership.");
      return;
    }
    if (isMember) {
      const confirmCancel = window.confirm("Are you sure you want to cancel your premium membership for this channel?");
      if (!confirmCancel) return;
    }
    try {
      const res = await fetch("/api/monetize/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: video.channel.id }),
      });
      const data = await res.json();
      if (res.ok) {
        if (isMember) {
          setIsMember(false);
          alert("Cancelled! You are no longer a premium member of this channel.");
        } else {
          setIsMember(true);
          alert("Success! You are now a premium member of this channel.");
        }
      } else {
        alert(data.error || "Failed to update membership.");
      }
    } catch (err) {
      console.error(err);
      alert("Error updating membership.");
    }
  };

  const handleLike = async () => {
    if (!currentUser) {
      alert("Please sign in to like videos.");
      return;
    }
    try {
      const res = await fetch(`/api/videos/${video.id}/like`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setHasLiked(data.liked);
        setLikesCount(data.likes);
      } else {
        alert(data.error || "Failed to like video.");
      }
    } catch (err) {
      console.error(err);
      alert("Error liking video.");
    }
  };

  const handleFlagVideo = async () => {
    if (!currentUser) {
      alert("Please sign in to flag this video.");
      return;
    }
    const reason = prompt("Enter reason for flagging/issuing a strike to this channel:");
    if (!reason) return;

    try {
      const res = await fetch("/api/admin/strike", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: video.channel.ownerId,
          videoId: video.id,
          reason,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(`Admin Strike Issued! User has ${data.strikeCount || 1} strikes now. ${data.banned ? "USER IS BANNED!" : ""}`);
      } else if (res.status === 403) {
        alert(`Video flagged! A moderation request has been sent to the admins. Reason: ${reason}`);
      } else {
        alert(data.error || "Failed to submit flag.");
      }
    } catch (err) {
      console.error(err);
      alert("Error submitting flag.");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Video Content & Comments */}
      <div className="lg:col-span-2">
        {isLive ? (
          <video
            ref={videoRef}
            src={video.videoUrl}
            controls
            className="w-full aspect-video rounded-lg bg-black border border-[#262626] mb-4"
            poster={video.thumbnailUrl || undefined}
          />
        ) : (
          <div className="w-full aspect-video rounded-lg bg-[#141414] border border-[#262626] mb-4 flex flex-col items-center justify-center">
            <h2 className="text-lg font-bold text-white mb-2">Premiere Starting Soon</h2>
            <p className="text-xs text-gray-500 mb-4">
              Scheduled for {new Date(video.scheduledFor!).toLocaleString()}
            </p>
            <div className="text-2xl font-extrabold text-[#ef4444] animate-pulse">
              {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
            </div>
          </div>
        )}

        <h1 className="text-xl font-bold text-white mb-2 leading-tight">
          {video.title}
        </h1>

        {/* View count & Time */}
        <div className="text-xs text-[#a3a3a3] mb-4 flex items-center gap-1.5">
          <span>{video.views.toLocaleString()} views</span>
          <span>•</span>
          <span>Released on {new Date(video.createdAt).toLocaleDateString()}</span>
        </div>

        {/* Channel Details */}
        <div className="flex items-center gap-4 py-4 border-y border-[#262626] mb-4">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-[#262626] flex items-center justify-center font-bold text-lg text-white shrink-0">
            {video.channel.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={video.channel.logoUrl} alt={video.channel.name} className="w-full h-full object-cover" />
            ) : (
              video.channel.name.slice(0, 1).toUpperCase()
            )}
          </div>
          <div>
            <h2 className="font-semibold text-sm text-white">
              {video.channel.name}
            </h2>
            <p className="text-xs text-gray-500">Channel Owner</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={handleJoinMembership}
              className={`text-xs font-semibold px-3 py-1.5 rounded transition cursor-pointer ${
                isMember
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-[#ef4444] hover:bg-[#dc2626] text-white"
              }`}
            >
              {isMember ? "Active Member" : "Join Member"}
            </button>
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded transition cursor-pointer border ${
                hasLiked
                  ? "bg-blue-600 border-blue-600 text-white hover:bg-blue-700"
                  : "bg-[#262626] border-[#262626] text-[#a3a3a3] hover:text-white"
              }`}
            >
               {likesCount} {hasLiked ? "Liked" : "Like"}
            </button>
            <button
              onClick={handleFlagVideo}
              className="bg-[#262626] hover:bg-[#ef4444] hover:text-white text-[#a3a3a3] text-xs font-semibold px-3 py-1.5 rounded border border-[#262626] transition cursor-pointer shrink-0"
            >
              Flag
            </button>
          </div>
        </div>

        {/* Video Description */}
        <div className="bg-[#141414] border border-[#262626] rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
            {video.description || "No description provided."}
          </p>
        </div>

        {/* Comments Section */}
        <CommentsSection videoId={video.id} currentUser={currentUser} />
      </div>

      {/* Live Chat / Watch Party sync side panel */}
      <div className="lg:col-span-1">
        <div className="sticky top-20">
          <WatchPartyPanel
            videoId={video.id}
            videoElementRef={videoRef}
            currentUser={currentUser}
            isPremiere={video.isPremiere}
          />
        </div>
      </div>
    </div>
  );
}
