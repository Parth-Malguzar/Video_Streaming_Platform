"use client";

import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";

interface WatchPartyPanelProps {
  videoId: string;
  videoElementRef: React.RefObject<HTMLVideoElement | null>;
  currentUser: {
    userId: string;
    username: string;
    email: string;
  } | null;
  isPremiere: boolean;
}

interface ChatMessage {
  id: string;
  content: string;
  userId: string;
  username: string;
  createdAt: string;
}

export default function WatchPartyPanel({
  videoId,
  videoElementRef,
  currentUser,
  isPremiere,
}: WatchPartyPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [isPartyMode, setIsPartyMode] = useState(false);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    if (!currentUser) return;

    // Connect to WebSocket Server (port 3001)
    const socketUrl = `${window.location.protocol}//${window.location.hostname}:3001`;
    const newSocket = io(socketUrl, {
      transports: ["websocket"],
    });

    newSocket.on("connect", () => {
      setConnected(true);
      newSocket.emit("join_room", {
        roomId: videoId,
        username: currentUser.username,
      });
    });

    newSocket.on("disconnect", () => {
      setConnected(false);
    });

    newSocket.on("receive_message", (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
    });

    newSocket.on("chat_history", (history: ChatMessage[]) => {
      setMessages(history);
    });

    // Listen to video sync actions from other watch party members
    newSocket.on("video_synced", ({ action, currentTime, username }) => {
      const video = videoElementRef.current;
      if (!video || !isPartyMode) return;

      console.log(`Received remote action: ${action} at ${currentTime} by ${username}`);
      
      // Set flag to prevent sending back the event
      isSyncingRef.current = true;

      // Apply action
      if (Math.abs(video.currentTime - currentTime) > 1.5) {
        video.currentTime = currentTime;
      }

      if (action === "play") {
        video.play().catch((err) => console.log("Video play error:", err));
      } else if (action === "pause") {
        video.pause();
      }

      // Reset flag after small delay
      setTimeout(() => {
        isSyncingRef.current = false;
      }, 300);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [videoId, currentUser, isPartyMode, videoElementRef]);

  // Synchronize local video events to other room members
  useEffect(() => {
    const video = videoElementRef.current;
    if (!video || !socket || !connected || !isPartyMode || !currentUser) return;

    const handlePlay = () => {
      if (isSyncingRef.current) return;
      socket.emit("sync_video", {
        roomId: videoId,
        action: "play",
        currentTime: video.currentTime,
        username: currentUser.username,
      });
    };

    const handlePause = () => {
      if (isSyncingRef.current) return;
      socket.emit("sync_video", {
        roomId: videoId,
        action: "pause",
        currentTime: video.currentTime,
        username: currentUser.username,
      });
    };

    const handleSeeked = () => {
      if (isSyncingRef.current) return;
      socket.emit("sync_video", {
        roomId: videoId,
        action: "seek",
        currentTime: video.currentTime,
        username: currentUser.username,
      });
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("seeked", handleSeeked);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("seeked", handleSeeked);
    };
  }, [videoElementRef, socket, connected, isPartyMode, videoId, currentUser]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !socket || !currentUser) return;

    socket.emit("send_message", {
      roomId: videoId,
      content: inputMessage,
      userId: currentUser.userId,
      username: currentUser.username,
    });

    setInputMessage("");
  };

  if (!currentUser) {
    return (
      <div className="bg-[#141414] border border-[#262626] rounded-lg p-4 text-center">
        <p className="text-sm text-[#a3a3a3]">
          <a href="/login" className="text-[#ef4444] hover:underline">Sign In</a> to join the Premiere Live Chat / Watch Party.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#141414] border border-[#262626] rounded-lg flex flex-col h-[500px]">
      {/* Header */}
      <div className="p-4 border-b border-[#262626] flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm text-white">
            {isPremiere ? "Live Premiere Chat" : "Watch Party Room"}
          </h3>
          <p className="text-[10px] text-gray-500">
            {connected ? `● Connected to ${isPremiere ? "premiere" : "party"}` : "○ Offline"}
          </p>
        </div>

        {/* Watch Party Sync Toggle */}
        <button
          onClick={() => setIsPartyMode(!isPartyMode)}
          className={`text-xs px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
            isPartyMode
              ? "bg-[#ef4444] text-white hover:bg-[#dc2626]"
              : "bg-[#262626] text-[#a3a3a3] hover:text-white"
          }`}
        >
          {isPartyMode ? "Sync Enabled" : "Sync Disabled"}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <p className="text-xs text-gray-500 text-center mt-8 font-medium">Welcome to the Live Room! Say hello.</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="text-xs">
              <span className="font-semibold text-gray-300 mr-2">{msg.username}:</span>
              <span className="text-[#f5f5f5] break-anywhere">{msg.content}</span>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-[#262626] flex gap-2">
        <input
          type="text"
          placeholder="Send a message..."
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          className="flex-1 bg-[#0a0a0a] border border-[#262626] text-xs rounded-md px-3 py-2 text-white focus:outline-none focus:border-[#ef4444]"
        />
        <button
          type="submit"
          className="bg-[#ef4444] hover:bg-[#dc2626] text-white text-xs font-semibold px-3 py-2 rounded transition cursor-pointer"
        >
          Send
        </button>
      </form>
    </div>
  );
}
