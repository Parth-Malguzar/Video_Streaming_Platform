import Link from "next/link";
import { auth } from "@/auth";
import { handleSignOut } from "@/app/actions/auth";
import SearchBar from "./SearchBar";

export default async function Navbar() {
  const session = await auth();
  const user = session?.user;
  const username = user?.username;
  const email = user?.email;
  const role = user?.role;

  return (
    <header className="border-b border-[#262626] bg-[#141414] px-4 py-3 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-white hover:opacity-90">
          <span className="bg-[#ef4444] text-white px-2 py-0.5 rounded text-sm font-black">D</span>
          <span>DTube</span>
        </Link>

        {/* Search Bar (Normal & Voice) */}
        <SearchBar />

        {/* Navigation Actions */}
        <nav className="flex items-center gap-4 text-sm font-medium">
          <Link href="/trending" className="text-gray-300 hover:text-white transition">
             Trending
          </Link>
          <Link href="/studio" className="text-gray-300 hover:text-white transition">
             Studio
          </Link>

          <span className="h-4 w-px bg-[#262626]" />

          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-gray-300 text-xs sm:text-sm">{username || email}</span>
              {role === "ADMIN" && (
                <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded text-xs">Admin</span>
              )}
              <form action={handleSignOut}>
                <button
                  type="submit"
                  className="text-gray-400 hover:text-red-400 transition cursor-pointer text-sm font-medium bg-transparent border-none p-0"
                >
                  Sign Out
                </button>
              </form>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login" className="text-gray-300 hover:text-white transition">
                Sign In
              </Link>
              <Link href="/signup" className="bg-[#ef4444] hover:bg-[#dc2626] text-white px-3 py-1.5 rounded transition">
                Sign Up
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}