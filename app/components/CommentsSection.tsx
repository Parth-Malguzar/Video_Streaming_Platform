"use client";

import { useState, useEffect, useCallback } from "react";
import { io } from "socket.io-client";

interface CommentUser {
  id: string;
  username: string | null;
  name: string | null;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  parentId: string | null;
  user: CommentUser;
}

interface CommentsSectionProps {
  videoId: string;
  currentUser: {
    userId: string;
    username: string;
    email: string;
  } | null;
}

export default function CommentsSection({ videoId, currentUser }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // States to manage reply forms and visibility
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});

  // Listen for real-time comment updates via WebSocket
  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001";
    const socket = io(wsUrl);

    socket.emit("join_room", {
      roomId: videoId,
      username: currentUser?.username || "Guest",
    });

    socket.on("new_comment_received", ({ comment }) => {
      setComments((prev) => {
        if (prev.some((c) => c.id === comment.id)) return prev;
        return [comment, ...prev];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [videoId, currentUser]);

  // Fetch comments
  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/videos/${videoId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch (err) {
      console.error("Error fetching comments:", err);
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchComments();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchComments]);

  // Handle root comment submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/videos/${videoId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        setContent("");
        fetchComments(); // Refresh comments list
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to submit comment");
      }
    } catch (err) {
      console.error("Error submitting comment:", err);
      alert("Error submitting comment");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle reply submit
  const handleReplySubmit = async (parentId: string) => {
    if (!replyContent.trim() || replySubmitting) return;

    setReplySubmitting(true);
    try {
      const res = await fetch(`/api/videos/${videoId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: replyContent, parentId }),
      });

      if (res.ok) {
        setReplyContent("");
        setActiveReplyId(null);
        // Expand the replies list for this parent automatically
        setExpandedReplies((prev) => ({ ...prev, [parentId]: true }));
        fetchComments(); // Refresh comments list
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to submit reply");
      }
    } catch (err) {
      console.error("Error submitting reply:", err);
      alert("Error submitting reply");
    } finally {
      setReplySubmitting(false);
    }
  };

  const toggleReplies = (commentId: string) => {
    setExpandedReplies((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  // Group comments into root comments and replies
  const rootComments = comments.filter((c) => !c.parentId);
  const getRepliesForParent = (parentId: string) => {
    return comments
      .filter((c) => c.parentId === parentId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); // oldest reply first
  };

  return (
    <section className="mt-8 border-t border-[#262626] pt-6">
      <h3 className="text-lg font-bold mb-4 text-white">
        Comments ({comments.length})
      </h3>

      {/* Post root comment form */}
      {currentUser ? (
        <form onSubmit={handleSubmit} className="mb-6 flex gap-3">
          <input
            type="text"
            placeholder="Add a comment..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={submitting}
            className="flex-1 bg-[#141414] border border-[#262626] text-sm rounded-md px-4 py-2 text-white focus:outline-none focus:border-[#ef4444] placeholder-gray-500"
          />
          <button
            type="submit"
            disabled={submitting}
            className="bg-[#ef4444] hover:bg-[#dc2626] disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded transition cursor-pointer"
          >
            {submitting ? "Posting..." : "Comment"}
          </button>
        </form>
      ) : (
        <p className="text-sm text-[#a3a3a3] mb-6">
          Please{" "}
          <a href="/login" className="text-[#ef4444] hover:underline">
            sign in
          </a>{" "}
          to post a comment.
        </p>
      )}

      {/* Comments list */}
      {loading ? (
        <p className="text-sm text-gray-500">Loading comments...</p>
      ) : rootComments.length === 0 ? (
        <p className="text-sm text-[#a3a3a3]">No comments yet. Be the first to comment!</p>
      ) : (
        <div className="space-y-6">
          {rootComments.map((comment) => {
            const replies = getRepliesForParent(comment.id);
            const isRepliesExpanded = !!expandedReplies[comment.id];
            const isReplying = activeReplyId === comment.id;

            return (
              <div key={comment.id} className="flex flex-col gap-2">
                {/* Main Comment Node */}
                <div className="flex gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-[#ef4444]/10 border border-[#ef4444]/20 flex items-center justify-center font-bold text-[#ef4444] shrink-0">
                    {(comment.user?.username || comment.user?.name || "U").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-white">
                        {comment.user?.username || comment.user?.name || "Anonymous"}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {new Date(comment.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <p className="text-[#f5f5f5] leading-relaxed break-words">{comment.content}</p>

                    {/* Action buttons (Reply, Show/Hide replies) */}
                    <div className="flex items-center gap-4 mt-2">
                      {currentUser && (
                        <button
                          onClick={() => {
                            setActiveReplyId(isReplying ? null : comment.id);
                            setReplyContent("");
                          }}
                          className="text-xs text-[#a3a3a3] hover:text-[#ef4444] font-medium transition cursor-pointer"
                        >
                          {isReplying ? "Cancel" : "Reply"}
                        </button>
                      )}

                      {replies.length > 0 && (
                        <button
                          onClick={() => toggleReplies(comment.id)}
                          className="text-xs text-[#ef4444] hover:text-red-400 font-semibold flex items-center gap-1 transition cursor-pointer"
                        >
                          {isRepliesExpanded ? "▲ Hide Replies" : `▼ Show ${replies.length} replies`}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Inline Reply Input Form */}
                {isReplying && currentUser && (
                  <div className="ml-11 mt-1 flex gap-2">
                    <input
                      type="text"
                      placeholder={`Reply to ${comment.user?.username || "comment"}...`}
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      disabled={replySubmitting}
                      className="flex-1 bg-[#1c1c1c] border border-[#262626] text-xs rounded px-3 py-1.5 text-white focus:outline-none focus:border-[#ef4444] placeholder-gray-600"
                    />
                    <button
                      onClick={() => handleReplySubmit(comment.id)}
                      disabled={!replyContent.trim() || replySubmitting}
                      className="bg-[#ef4444] hover:bg-[#dc2626] disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded transition cursor-pointer"
                    >
                      {replySubmitting ? "Replying..." : "Reply"}
                    </button>
                  </div>
                )}

                {/* Replies Thread List */}
                {isRepliesExpanded && replies.length > 0 && (
                  <div className="ml-11 pl-4 border-l border-[#262626] mt-2 space-y-4">
                    {replies.map((reply) => (
                      <div key={reply.id} className="flex gap-2.5 text-xs">
                        <div className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center font-bold text-gray-400 shrink-0">
                          {(reply.user?.username || reply.user?.name || "U").slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-semibold text-white">
                              {reply.user?.username || reply.user?.name || "Anonymous"}
                            </span>
                            <span className="text-[10px] text-gray-500">
                              {new Date(reply.createdAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                          <p className="text-gray-300 leading-relaxed break-words">{reply.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
