"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { navItems } from "@/features/home/data/nav-items";
import { Icons } from "@/layout/icons";
import { openCommandMenu } from "@/components/common/command-menu";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <header className="sticky top-0 z-50 max-w-screen overflow-x-hidden bg-background px-2 pt-2">
        <div className="screen-line-top screen-line-bottom page-frame relative border-x border-y border-line bg-background before:z-1 after:z-1">
          <div className="flex h-12 items-center justify-between gap-2 px-2 sm:gap-4">
            <Link
              href="/"
              aria-label="Home"
              className="flex h-8 items-center border-r border-line pr-3 font-mono text-[12px] font-bold tracking-[0.24em] transition-opacity hover:opacity-80"
            >
              PORTO
              <span className="ml-1 text-muted-foreground">/&gt;</span>
            </Link>

            <div className="ml-auto flex items-center">
              <div className="hidden items-center md:flex">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-2 border-none px-2 font-mono text-[12px] font-medium text-muted-foreground hover:bg-transparent hover:text-foreground"
                  aria-label="Search"
                  onClick={() => openCommandMenu()}
                >
                  <Search className="size-3.5" />
                  Search
                  <span className="inline-flex gap-0.5">
                    <span className="rounded-[4px] border border-line px-1 leading-4">
                      ⌘
                    </span>
                    <span className="rounded-[4px] border border-line px-1 leading-4">
                      K
                    </span>
                  </span>
                </Button>
              </div>

              <div className="mx-2 hidden h-4 w-px bg-line md:block" />

              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-2 border-none px-2 font-mono text-[12px] font-medium hover:bg-transparent"
                asChild
              >
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub"
                >
                  <Icons.gitHub className="size-4" />
                  <span className="hidden md:inline-block">1.6k</span>
                </a>
              </Button>

              <div className="mx-2 h-4 w-px bg-line" />

              <ThemeToggle />
            </div>
          </div>

          <nav
            aria-label="Primary navigation"
            className="grid h-8 grid-cols-6 border-t border-line"
          >
            {navItems.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "flex min-w-0 items-center justify-center border-line px-1 font-mono text-[10px] font-medium tracking-[0.08em] uppercase transition-colors sm:text-[11px]",
                  index > 0 ? "border-l" : "",
                  isActive(item.href)
                    ? "bg-muted/60 text-foreground"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                )}
              >
                <span className="truncate">{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="absolute top-[-3.5px] left-[-4.5px] size-2 border border-line bg-background" />
          <div className="absolute top-[-3.5px] right-[-4.5px] size-2 border border-line bg-background" />
        </div>
      </header>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-20 bg-linear-to-t from-background to-transparent sm:hidden" />
    </>
  );
}
