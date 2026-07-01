"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { io } from "socket.io-client";

interface Notification {
  id: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  sender: {
    username: string | null;
    name: string | null;
  };
  video: {
    id: string;
    title: string;
  } | null;
  comment: {
    id: string;
    content: string;
  } | null;
}

interface NotificationBellProps {
  userId: string;
}

export default function NotificationBell({ userId }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch initial notifications
  useEffect(() => {
    async function fetchNotifications() {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
        }
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      }
    }
    fetchNotifications();
  }, []);

  // Listen for real-time notifications via WebSockets
  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001";
    const socket = io(wsUrl);

    socket.on("connect", () => {
      socket.emit("join_user", { userId });
    });

    socket.on("new_notification", (newNotif: Notification) => {
      setNotifications((prev) => [newNotif, ...prev]);
    });

    return () => {
      socket.disconnect();
    };
  }, [userId]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
        );
      }
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-1.5 rounded-full bg-[#1c1c1c] border border-[#262626] text-gray-300 hover:text-white hover:border-gray-500 transition cursor-pointer flex items-center justify-center"
      >
        <span className="text-base">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-[#ef4444] text-white font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-[#141414] border border-[#262626] rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="p-3 border-b border-[#262626] flex items-center justify-between">
            <span className="font-semibold text-sm text-white">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-[#ef4444] hover:text-red-400 font-medium transition cursor-pointer bg-transparent border-none p-0"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-[#262626]">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#a3a3a3]">
                No notifications yet.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3 transition text-xs flex flex-col gap-1 ${
                    notif.isRead ? "bg-transparent" : "bg-[#1c1c1c]/50"
                  }`}
                  onClick={() => !notif.isRead && handleMarkAsRead(notif.id)}
                >
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-gray-300 leading-snug">
                      <span className="font-bold text-white">
                        {notif.sender.name || notif.sender.username || "Someone"}
                      </span>{" "}
                      {notif.type === "REPLY" && "replied to your comment:"}
                      {notif.type === "LIKE" && "liked your video:"}
                      {notif.type === "SUBSCRIBE" && "subscribed to your channel!"}
                    </p>
                    {!notif.isRead && (
                      <span className="w-1.5 h-1.5 bg-[#ef4444] rounded-full shrink-0 mt-1" />
                    )}
                  </div>

                  {notif.type === "REPLY" && notif.comment && (
                    <p className="text-gray-400 italic bg-[#0a0a0a]/50 p-1.5 rounded border border-[#262626] line-clamp-2">
                      "{notif.comment.content}"
                    </p>
                  )}

                  {notif.video && (
                    <Link
                      href={`/watch/${notif.video.id}`}
                      className="text-[#ef4444] hover:text-red-400 font-medium mt-1 inline-block truncate hover:underline"
                      onClick={() => setIsOpen(false)}
                    >
                      on video "{notif.video.title}"
                    </Link>
                  )}

                  <span className="text-[10px] text-[#737373] mt-0.5">
                    {new Date(notif.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
