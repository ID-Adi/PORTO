"use client";

import { Menu, Search } from "lucide-react";

export function FloatingNav() {
  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex md:hidden -translate-x-1/2 items-center gap-1.5 rounded-full border border-(--line) bg-(--background)/80 px-2 py-1.5 backdrop-blur-md shadow-sm sm:bottom-8">
      <button
        type="button"
        className="flex items-center gap-2 rounded-full px-4 py-2 font-mono text-[13px] font-medium text-(--foreground) transition-colors hover:bg-(--foreground) hover:text-(--background)"
      >
        <Menu className="h-4 w-4" />
        <span>Menu</span>
      </button>

      <div className="h-4 w-px bg-(--line)" />

      <button
        type="button"
        className="flex items-center gap-2 rounded-full px-4 py-2 font-mono text-[13px] font-medium text-(--muted-foreground) transition-colors hover:bg-(--foreground) hover:text-(--background)"
      >
        <Search className="h-4 w-4" />
        <span>Search</span>
      </button>
    </div>
  );
}
