"use client";

import { Moon, Search, Sun } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Icons } from "@/shared/ui/icons";

const navItems = [
  { label: "Work", href: "#work" },
  { label: "Process", href: "#process" },
  { label: "Rules", href: "#rules" },
  { label: "Contact", href: "#contact" },
];

export function SiteHeader() {
  const [isDark, setIsDark] = useState(false);

  function syncTheme() {
    if (typeof window !== "undefined") {
      setIsDark(document.documentElement.classList.contains("dark"));
    }
  }

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
  }

  return (
    <header className="sticky top-0 z-50 border-t-2 border-b border-(--line) bg-(--background)/80 backdrop-blur-md">
      <div className="mx-auto flex h-12 w-[calc(100%-2rem)] max-w-[768px] items-center justify-between px-2 md:w-full">
        <div className="flex h-full items-center gap-8">
          <Link
            href="/"
            className="flex h-full items-center font-mono text-sm font-bold tracking-tight text-(--foreground)"
          >
            PORTO
          </Link>
          <nav className="hidden h-full items-center gap-1 md:flex">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="flex h-full items-center px-4 font-mono text-sm text-(--muted-foreground) transition-colors hover:text-(--foreground)"
              >
                {item.label} /&gt;
              </a>
            ))}
          </nav>
        </div>
        <div className="flex h-full items-center gap-2 border-l border-(--line) pl-2">
          <Button
            variant="ghost"
            size="sm"
            className="hidden h-8 items-center gap-2 px-2 text-(--muted-foreground) hover:text-(--foreground) md:flex"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
            <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border border-(--line) bg-(--muted)/50 px-1.5 font-mono text-[10px] font-medium sm:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>

          <Button variant="ghost" size="sm" className="h-8 gap-2 px-2" asChild>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
            >
              <Icons.gitHub className="h-4 w-4" />
              <span className="hidden font-mono text-xs md:inline-block">1.6k</span>
            </a>
          </Button>

          {/* Vertical Separator */}
          <div className="mx-1 h-4 w-px bg-(--line)" />

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {isDark ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
