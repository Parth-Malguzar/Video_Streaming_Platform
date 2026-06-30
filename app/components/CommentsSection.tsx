"use client";

import { useState, useEffect, useCallback } from "react";

interface CommentUser {
  id: string;
  username: string | null;
  name: string | null;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
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

  // Handle comment submit
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

  return (
    <section className="mt-8 border-t border-[#262626] pt-6">
      <h3 className="text-lg font-bold mb-4 text-white">
        Comments ({comments.length})
      </h3>

      {/* Post comment form */}
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
      ) : comments.length === 0 ? (
        <p className="text-sm text-[#a3a3a3]">No comments yet. Be the first to comment!</p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-[#262626] flex items-center justify-center font-bold text-gray-400 shrink-0">
                {(comment.user?.username || comment.user?.name || "U").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-white">
                    {comment.user?.username || comment.user?.name || "Anonymous"}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-[#f5f5f5] leading-relaxed break-anywhere">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
