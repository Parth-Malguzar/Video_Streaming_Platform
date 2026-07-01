"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function SearchBarInput() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("search") || "");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check for speech recognition support
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
        // Direct route redirect on successful recognition
        router.push(`/?search=${encodeURIComponent(transcript)}`);
      };

      rec.onerror = (e: any) => {
        console.error("Speech recognition error:", e.error);
        setIsListening(false);
        if (e.error === "not-allowed") {
          alert("Microphone access is blocked. Please click the camera/microphone icon in your browser address bar and select 'Allow' to use voice search.");
        } else if (e.error === "network") {
          alert("Voice search requires an active internet connection to process speech recognition. Please check your network connection.");
        } else if (e.error === "no-speech") {
          // Keep it quiet, just stop listening
        } else {
          alert(`Speech recognition error: ${e.error}`);
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, [router]);

  // Sync state if search parameter changes from outside (e.g. clicking logo)
  useEffect(() => {
    setQuery(searchParams.get("search") || "");
  }, [searchParams]);

  const handleVoiceSearch = () => {
    if (!recognitionRef.current) {
      alert("Voice search is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    router.push(`/?search=${encodeURIComponent(query)}`);
  };

  return (
    <form onSubmit={handleSubmit} className="flex-1 max-w-md flex items-center gap-2">
      <div className="relative flex-1">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search videos..."
          className="w-full bg-[#0a0a0a] border border-[#262626] text-sm rounded-md pl-4 pr-10 py-2 text-white focus:outline-none focus:border-[#ef4444] placeholder-gray-500 transition-all duration-300"
        />
        <button type="submit" className="absolute right-3 top-2 text-gray-400 hover:text-white text-sm transition-colors cursor-pointer">
          🔍
        </button>
      </div>

      <button
        type="button"
        onClick={handleVoiceSearch}
        title="Search with your voice"
        className={`p-2 rounded-full border transition-all duration-300 flex items-center justify-center shrink-0 cursor-pointer ${
          isListening
            ? "bg-red-600 border-red-600 text-white animate-pulse shadow-[0_0_8px_#ef4444]"
            : "bg-[#0a0a0a] border-[#262626] text-gray-400 hover:text-white hover:border-[#ef4444]"
        }`}
      >
        <span className="text-sm">🎙️</span>
      </button>
    </form>
  );
}

export default function SearchBar() {
  return (
    <div className="flex-1 max-w-md hidden sm:block">
      <Suspense fallback={
        <div className="w-full bg-[#0a0a0a] border border-[#262626] h-[38px] rounded-md animate-pulse" />
      }>
        <SearchBarInput />
      </Suspense>
    </div>
  );
}
