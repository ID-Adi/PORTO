"use client";

import { Moon, Search, Sun } from "lucide-react";
import { useEffect, useReducer } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Icons } from "@/shared/ui/icons";

const navItems = [
  { label: "Components", href: "#components" },
  { label: "Blocks", href: "#projects" },
  { label: "Blog", href: "#writing" },
  { label: "Sponsors", href: "#partners" },
];

function getInitialTheme(): boolean {
  if (typeof window === "undefined") return false;
  const stored = window.localStorage.getItem("porto-theme");
  if (stored) return stored === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function SiteHeader() {
  const [isDark, dispatch] = useReducer(
    (_: boolean, action: boolean) => action,
    false
  );

  useEffect(() => {
    const theme = getInitialTheme();
    document.documentElement.classList.toggle("dark", theme);
    dispatch(theme);
  }, []);

  function toggleTheme() {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("porto-theme", next ? "dark" : "light");
    dispatch(next);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-(--line) bg-(--background)">
      <div className="page-frame flex h-14 items-center justify-between border-x border-(--line)">
        {/* Left Section */}
        <div className="flex h-full items-center">
          <Link href="/" aria-label="Home" className="flex h-full items-center border-r border-(--line) px-4 transition-colors hover:bg-black/[0.02] sm:px-5">
            <span className="font-mono text-[12px] font-bold tracking-widest text-(--foreground)">
              PORTO<span className="text-(--muted-foreground)">/&gt;</span>
            </span>
          </Link>

          <nav className="hidden h-full items-center gap-6 px-6 md:flex">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="flex h-full items-center font-mono text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>

        {/* Right Section */}
        <div className="flex h-full items-center border-l border-(--line)">
          <div className="hidden h-full items-center border-r border-(--line) px-2 md:flex">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 items-center gap-2 rounded-md px-2 font-mono text-[13px] font-normal text-[var(--muted-foreground)] hover:bg-transparent hover:text-[var(--foreground)]"
              aria-label="Search"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="sr-only">Search...</span>
              <div className="flex gap-0.5">
                <span className="rounded-[4px] border border-(--line) px-1 text-[9px] leading-4 tracking-tighter">⌘</span>
                <span className="rounded-[4px] border border-(--line) px-1 text-[9px] leading-4 tracking-tighter">K</span>
              </div>
            </Button>
          </div>

          <div className="flex h-full items-center border-r border-(--line) px-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 rounded-md px-2 font-mono text-[13px] font-normal text-[var(--foreground)] hover:bg-transparent"
              asChild
            >
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                <Icons.gitHub className="h-4 w-4" />
                <span className="hidden font-mono text-[13px] md:inline-block">1.6k</span>
              </a>
            </Button>
          </div>

          <div className="flex h-full items-center px-1 sm:px-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-md hover:bg-transparent"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
