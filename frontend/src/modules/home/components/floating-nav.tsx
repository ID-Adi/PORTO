"use client";

import { Menu, Search } from "lucide-react";

export function FloatingNav() {
  return (
    <div className="fixed bottom-3 left-1/2 z-50 flex -translate-x-1/2 items-center rounded-xl bg-(--surface) py-1 pr-1 pl-2.5 shadow-md ring ring-black/8 sm:hidden dark:ring-white/10">
      <button
        type="button"
        className="flex min-w-20 items-center gap-2 rounded-none border-none px-0 py-2 font-mono text-[13px] font-medium text-(--foreground)"
      >
        <Menu className="h-4 w-4" />
        <span>Menu</span>
      </button>

      <div className="mx-2 h-6 w-px bg-(--line)" />

      <button
        type="button"
        className="flex min-w-20 items-center gap-2 rounded-none border-none px-0 py-2 font-mono text-[13px] font-medium text-(--muted-foreground)"
      >
        <Search className="h-4 w-4" />
        <span>Search</span>
      </button>
    </div>
  );
}
