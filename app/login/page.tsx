"use client";

import { useState, use } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";

interface PageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default function LoginPage({ searchParams }: PageProps) {
  const resolvedSearchParams = use(searchParams);
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        loginIdentifier,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid credentials or deactivated account.");
      } else {
        // Redirect to callbackUrl or home page
        const callbackUrl = resolvedSearchParams.callbackUrl || "/";
        window.location.href = callbackUrl;
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider: "github" | "google") => {
    signIn(provider, { callbackUrl: resolvedSearchParams.callbackUrl || "/" });
  };

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-[#141414] border border-[#262626] rounded-xl p-8 shadow-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight text-white mb-2">
            <span className="bg-[#ef4444] text-white px-2 py-0.5 rounded text-sm font-black">D</span>
            <span>DTube</span>
          </Link>
          <h2 className="text-xl font-semibold text-white">Sign in to your account</h2>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
              Username or Email
            </label>
            <input
              type="text"
              value={loginIdentifier}
              onChange={(e) => setLoginIdentifier(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#262626] text-sm rounded-md px-4 py-2 text-white focus:outline-none focus:border-[#ef4444]"
              placeholder="Enter username or email"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#262626] text-sm rounded-md px-4 py-2 text-white focus:outline-none focus:border-[#ef4444]"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#ef4444] hover:bg-[#dc2626] disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-md transition mt-6 cursor-pointer"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Social Authentication Divider */}
        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-[#262626]" />
          <span className="px-3 text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Or connect with</span>
          <div className="flex-1 border-t border-[#262626]" />
        </div>

        {/* Social Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => handleSocialLogin("google")}
            className="flex items-center justify-center gap-2 bg-[#0a0a0a] hover:bg-[#141414] border border-[#262626] rounded-md py-2.5 text-xs font-semibold text-white transition cursor-pointer w-full"
          >
            Google
          </button>
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-[#ef4444] hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
