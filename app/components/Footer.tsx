export default function Footer() {
  return (
    <footer className="border-t border-[#262626] bg-[#141414] py-6 text-center text-xs text-gray-500 mt-auto">
      <div className="max-w-7xl mx-auto px-4">
        &copy; {new Date().getFullYear()} DTube Streaming Platform. All rights reserved.
      </div>
    </footer>
  );
}