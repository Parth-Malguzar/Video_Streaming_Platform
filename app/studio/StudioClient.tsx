"use client";

import { useState, useEffect } from "react";

interface Channel {
  id: string;
  name: string;
}

interface Video {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  views: number;
  isPublished: boolean;
  isPremiere: boolean;
  scheduledFor: string | null;
  createdAt: string;
}

interface StudioClientProps {
  initialChannels: Channel[];
  currentUser: {
    userId: string;
    username: string;
    email: string;
  };
}

export default function StudioClient({ initialChannels, currentUser }: StudioClientProps) {
  const [channels, setChannels] = useState<Channel[]>(initialChannels);
  
  // Channel creation form state
  const [channelName, setChannelName] = useState("");
  const [channelDesc, setChannelDesc] = useState("");
  const [channelLogo, setChannelLogo] = useState("");

  // Video creation form state
  const [selectedChannelId, setSelectedChannelId] = useState(
    initialChannels.length > 0 ? initialChannels[0].id : ""
  );
  const [videoTitle, setVideoTitle] = useState("");
  const [videoDesc, setVideoDesc] = useState("");
  const [videoUrl, setVideoUrl] = useState("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4"); // Default testing sample
  const [thumbnailUrl, setThumbnailUrl] = useState("https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=640"); // Default testing thumbnail
  const [isPremiere, setIsPremiere] = useState(false);
  const [scheduledFor, setScheduledFor] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Tab management & Videos list state
  const [activeTab, setActiveTab] = useState<"upload" | "videos">("upload");
  const [videosList, setVideosList] = useState<Video[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);

  // Fetch videos for the selected channel
  const fetchVideos = async () => {
    if (!selectedChannelId) return;
    setLoadingVideos(true);
    try {
      const res = await fetch(`/api/studio/videos?channelId=${selectedChannelId}`);
      if (res.ok) {
        const data = await res.json();
        setVideosList(data.videos || []);
      }
    } catch (err) {
      console.error("Failed to load channel videos", err);
    } finally {
      setLoadingVideos(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, [selectedChannelId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "video" | "image") => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setSuccess("");
    if (type === "video") setUploadingVideo(true);
    else setUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      const res = await fetch("/api/studio/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.url) {
        if (type === "video") {
          setVideoUrl(data.url);
          setSuccess("Video uploaded successfully to Cloudinary!");
        } else {
          setThumbnailUrl(data.url);
          setSuccess("Thumbnail uploaded successfully to Cloudinary!");
        }
      } else {
        setError(data.error || `Failed to upload ${type}.`);
      }
    } catch (err) {
      console.error(err);
      setError(`An error occurred while uploading the ${type}.`);
    } finally {
      if (type === "video") setUploadingVideo(false);
      else setUploadingImage(false);
    }
  };

  // Create Channel Handler
  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName.trim()) {
      setError("Channel name is required.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/studio/channels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: channelName,
          description: channelDesc,
          logoUrl: channelLogo || null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setChannels((prev) => [...prev, data.channel]);
        setSelectedChannelId(data.channel.id);
        setChannelName("");
        setChannelDesc("");
        setChannelLogo("");
        setSuccess("Channel created successfully!");
      } else {
        setError(data.error || "Failed to create channel.");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while creating the channel.");
    } finally {
      loading && setLoading(false);
    }
  };

  // Create Video Handler
  const handlePublishVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoTitle.trim() || !videoUrl.trim() || !selectedChannelId) {
      setError("Title, video URL, and channel selection are required.");
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/studio/videos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: videoTitle,
          description: videoDesc,
          videoUrl,
          thumbnailUrl: thumbnailUrl || null,
          channelId: selectedChannelId,
          isPremiere,
          scheduledFor: isPremiere && scheduledFor ? new Date(scheduledFor).toISOString() : null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setVideoTitle("");
        setVideoDesc("");
        setIsPremiere(false);
        setScheduledFor("");
        setSuccess("Video published successfully!");
        
        // Refresh videos list
        await fetchVideos();

        // Switch to videos list tab
        setTimeout(() => {
          setActiveTab("videos");
          setSuccess("");
        }, 1500);
      } else {
        setError(data.error || "Failed to publish video.");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while publishing the video.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-[#141414] border border-[#262626] rounded-xl p-8 shadow-md my-8">
      <h1 className="text-xl font-bold text-white mb-6">📹 Creator Studio</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs rounded-md">
          {success}
        </div>
      )}

      {/* CASE 1: User needs to create a channel first */}
      {channels.length === 0 ? (
        <div>
          <p className="text-sm text-[#a3a3a3] mb-6">
            Welcome, <strong>{currentUser.username}</strong>! You need to create a Channel before you can upload videos.
          </p>

          <form onSubmit={handleCreateChannel} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                Channel Name
              </label>
              <input
                type="text"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#262626] text-sm rounded-md px-4 py-2 text-white focus:outline-none focus:border-[#ef4444]"
                placeholder="e.g. My Awesome Vlog Channel"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                Description
              </label>
              <textarea
                value={channelDesc}
                onChange={(e) => setChannelDesc(e.target.value)}
                rows={3}
                className="w-full bg-[#0a0a0a] border border-[#262626] text-sm rounded-md px-4 py-2 text-white focus:outline-none focus:border-[#ef4444]"
                placeholder="Brief details about your channel..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                Logo URL (Optional)
              </label>
              <input
                type="text"
                value={channelLogo}
                onChange={(e) => setChannelLogo(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#262626] text-sm rounded-md px-4 py-2 text-white focus:outline-none focus:border-[#ef4444]"
                placeholder="https://example.com/logo.jpg"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#ef4444] hover:bg-[#dc2626] disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-md transition mt-6 cursor-pointer"
            >
              {loading ? "Creating Channel..." : "Create Channel"}
            </button>
          </form>
        </div>
      ) : (
        /* CASE 2: Upload / Manage Videos Tabs */
        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="flex border-b border-[#262626]">
            <button
              onClick={() => setActiveTab("upload")}
              className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition cursor-pointer ${
                activeTab === "upload"
                  ? "border-[#ef4444] text-white"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              Upload Video
            </button>
            <button
              onClick={() => setActiveTab("videos")}
              className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition cursor-pointer ${
                activeTab === "videos"
                  ? "border-[#ef4444] text-white"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              My Videos ({videosList.length})
            </button>
          </div>

          {activeTab === "upload" ? (
            <form onSubmit={handlePublishVideo} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                  Publishing Channel
                </label>
                <select
                  value={selectedChannelId}
                  onChange={(e) => setSelectedChannelId(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#262626] text-sm rounded-md px-4 py-2 text-white focus:outline-none focus:border-[#ef4444]"
                >
                  {channels.map((chan) => (
                    <option key={chan.id} value={chan.id}>
                      {chan.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                  Video Title
                </label>
                <input
                  type="text"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#262626] text-sm rounded-md px-4 py-2 text-white focus:outline-none focus:border-[#ef4444]"
                  placeholder="Enter video title"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  value={videoDesc}
                  onChange={(e) => setVideoDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-[#0a0a0a] border border-[#262626] text-sm rounded-md px-4 py-2 text-white focus:outline-none focus:border-[#ef4444]"
                  placeholder="What is this video about?"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Video File
                </label>
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => handleFileUpload(e, "video")}
                    disabled={uploadingVideo}
                    className="block w-full text-xs text-gray-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#ef4444] file:text-white hover:file:bg-[#dc2626] file:cursor-pointer disabled:opacity-50"
                  />
                  {uploadingVideo && (
                    <div className="text-xs text-red-500 flex items-center gap-1.5 font-semibold">
                      Uploading video...
                    </div>
                  )}
                  <input
                    type="text"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#262626] text-xs rounded-md px-4 py-2 text-white focus:outline-none focus:border-[#ef4444] font-mono"
                    placeholder="Or paste direct mp4 URL"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Thumbnail Image (Optional)
                </label>
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, "image")}
                    disabled={uploadingImage}
                    className="block w-full text-xs text-gray-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#ef4444] file:text-white hover:file:bg-[#dc2626] file:cursor-pointer disabled:opacity-50"
                  />
                  {uploadingImage && (
                    <div className="text-xs text-red-500 flex items-center gap-1.5 font-semibold">
                      Uploading thumbnail...
                    </div>
                  )}
                  <input
                    type="text"
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#262626] text-xs rounded-md px-4 py-2 text-white focus:outline-none focus:border-[#ef4444] font-mono"
                    placeholder="Or paste direct image URL"
                  />
                </div>
              </div>

              {/* Premiere scheduling options */}
              <div className="border border-[#262626] rounded-md p-4 space-y-4 bg-[#0a0a0a]/50">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPremiere"
                    checked={isPremiere}
                    onChange={(e) => setIsPremiere(e.target.checked)}
                    className="w-4 h-4 accent-[#ef4444] cursor-pointer"
                  />
                  <label htmlFor="isPremiere" className="text-xs font-semibold text-white cursor-pointer select-none">
                    Schedule as a Live Premiere
                  </label>
                </div>

                {isPremiere && (
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">
                      Scheduled Time
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduledFor}
                      onChange={(e) => setScheduledFor(e.target.value)}
                      className="bg-[#0a0a0a] border border-[#262626] text-xs rounded-md px-3 py-2 text-white focus:outline-none focus:border-[#ef4444]"
                      required={isPremiere}
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || uploadingVideo || uploadingImage}
                className="w-full bg-[#ef4444] hover:bg-[#dc2626] disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-md transition mt-6 cursor-pointer"
              >
                {loading ? "Publishing Video..." : "Publish Video"}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                  Active Channel
                </label>
                <select
                  value={selectedChannelId}
                  onChange={(e) => setSelectedChannelId(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#262626] text-sm rounded-md px-4 py-2 text-white focus:outline-none focus:border-[#ef4444]"
                >
                  {channels.map((chan) => (
                    <option key={chan.id} value={chan.id}>
                      {chan.name}
                    </option>
                  ))}
                </select>
              </div>

              {loadingVideos ? (
                <div className="text-center py-12 text-sm text-[#a3a3a3] animate-pulse">
                  Loading channel videos...
                </div>
              ) : videosList.length === 0 ? (
                <div className="text-center py-12 text-sm text-gray-500">
                  No videos found on this channel. Switch to "Upload Video" tab to publish one!
                </div>
              ) : (
                <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                  {videosList.map((v) => (
                    <div key={v.id} className="flex gap-4 p-3 bg-[#0a0a0a]/40 border border-[#262626] rounded-lg items-center">
                      {/* Thumbnail preview */}
                      <div className="w-24 aspect-video rounded bg-[#141414] overflow-hidden shrink-0 border border-[#262626]">
                        {v.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={v.thumbnailUrl} alt={v.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-600">No Thumb</div>
                        )}
                      </div>
                      
                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-white truncate">{v.title}</h4>
                        <div className="flex flex-wrap gap-2 items-center mt-1.5 text-[10px]">
                          {/* Status Badge */}
                          {v.isPremiere && !v.isPublished ? (
                            <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded font-medium">
                              Scheduled Premiere
                            </span>
                          ) : v.isPremiere && v.isPublished ? (
                            <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-1.5 py-0.5 rounded font-medium">
                              Live Premiere
                            </span>
                          ) : (
                            <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-1.5 py-0.5 rounded font-medium">
                              Published
                            </span>
                          )}
                          <span className="text-gray-500">•</span>
                          <span className="text-gray-400">{v.views.toLocaleString()} views</span>
                          <span className="text-gray-500">•</span>
                          <span className="text-gray-400">{new Date(v.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      {/* Action Link */}
                      <a
                        href={`/watch/${v.id}`}
                        className="bg-[#262626] hover:bg-[#ef4444] hover:text-white text-gray-300 px-3 py-1.5 rounded text-xs font-semibold transition shrink-0"
                      >
                        Watch 🔗
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
