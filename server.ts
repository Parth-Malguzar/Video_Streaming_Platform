import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { prisma } from "./lib/prisma";
const PORT = process.env.WS_PORT ? parseInt(process.env.WS_PORT) : 3001;

const httpServer = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("DTube WebSocket Server is running.\n");
});

const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all origins for development ease
    methods: ["GET", "POST"],
  },
});

interface UserJoinPayload {
  roomId: string;
  username: string;
  userId?: string;
}

interface ChatMessagePayload {
  roomId: string;
  userId: string;
  username: string;
  content: string;
}

interface SyncStatePayload {
  roomId: string;
  action: "play" | "pause" | "seek";
  currentTime: number;
  username: string;
}

const roomHistories: Record<string, any[]> = {};

io.on("connection", (socket: Socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // 1. Join Room (for watch party or premiere live chat)
  socket.on("join_room", ({ roomId, username }: UserJoinPayload) => {
    socket.join(roomId);
    console.log(`User ${username} (${socket.id}) joined room: ${roomId}`);

    // Send history to joining client
    if (roomHistories[roomId]) {
      socket.emit("chat_history", roomHistories[roomId]);
    }

    // Broadcast to others in the room that a user joined
    socket.to(roomId).emit("user_joined", {
      username,
      message: `${username} joined the party!`,
    });
  });

  // 2. Real-time Live Premiere Chat Messages
  socket.on("send_message", ({ roomId, userId, username, content }: ChatMessagePayload) => {
    if (!content.trim()) return;

    const message = {
      id: Math.random().toString(),
      content: content.trim(),
      userId,
      username,
      createdAt: new Date().toISOString(),
    };

    if (!roomHistories[roomId]) {
      roomHistories[roomId] = [];
    }
    roomHistories[roomId].push(message);
    if (roomHistories[roomId].length > 50) {
      roomHistories[roomId].shift();
    }

    // Broadcast the message to all clients in the room (including sender)
    io.to(roomId).emit("receive_message", message);
  });

  // 3. Watch Party Player Synchronization
  socket.on("sync_video", ({ roomId, action, currentTime, username }: SyncStatePayload) => {
    console.log(`Sync video event: ${action} at ${currentTime}s by ${username} in room ${roomId}`);
    // Broadcast to everyone else in the room
    socket.to(roomId).emit("video_synced", {
      action,
      currentTime,
      username,
    });
  });

  // 3.5. Trigger Premiere Live from cron background worker
  socket.on("trigger_premiere_live", ({ videoId }: { videoId: string }) => {
    console.log(`Premiere went live broadcast for: ${videoId}`);
    io.to(videoId).emit("premiere_live", { videoId });
  });

  // 3.6. Broadcast updated like count from API route to room
  socket.on("like_updated", ({ videoId, likes }: { videoId: string; likes: number }) => {
    console.log(`Likes updated for video ${videoId} -> ${likes}`);
    io.to(videoId).emit("likes_count_updated", { videoId, likes });
  });

  // 3.7. Broadcast new comment from API route to room
  socket.on("comment_posted", ({ videoId, comment }: { videoId: string; comment: any }) => {
    console.log(`New comment posted on video ${videoId}`);
    io.to(videoId).emit("new_comment_received", { videoId, comment });
  });

  // 4. Handle Disconnect
  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[DTube WS] WebSocket server running on http://localhost:${PORT}`);
});
