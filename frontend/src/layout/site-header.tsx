"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Frame, Home as HomeIcon, Search, Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";
import { navItems } from "@/features/home/data/nav-items";
import { Icons } from "@/layout/icons";
import { openCommandMenu } from "@/components/common/command-menu";
import { HeaderProfileMenu } from "@/components/common/header-profile-menu";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { useHasMounted } from "@/hooks/use-has-mounted";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const hasMounted = useHasMounted();
  const settings = trpc.siteSettings.get.useQuery(undefined, {
    enabled: hasMounted,
    staleTime: 60_000,
  });
  const logoUrl = hasMounted ? (settings.data?.logoUrl ?? null) : null;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const quickLinks = [
    { href: "/", label: "Home", icon: HomeIcon },
    { href: "/tools", label: "Tools", icon: Wrench },
  ] as const;

  const railItems = navItems.filter((item) => item.href !== "/");

  return (
    <>
      <header className="screen-line-bottom sticky top-0 z-50 max-w-screen overflow-x-hidden bg-background px-2 pt-2">
        <div className="screen-line-top page-frame relative border-x border-line bg-background before:z-1 after:z-1">
          <div className="flex h-12 items-center justify-between gap-2 px-2 sm:gap-4">
            <Link
              href="/"
              aria-label="Home"
              className="flex h-8 items-center gap-2 border-r border-line pr-3 font-mono text-[12px] font-bold tracking-[0.24em] transition-opacity hover:opacity-80"
            >
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt="Logo"
                  width={20}
                  height={20}
                  className="h-5 w-auto object-contain"
                  unoptimized
                  priority
                />
              ) : (
                <div
                  aria-hidden
                  className="h-5 w-5 border border-line bg-[repeating-linear-gradient(45deg,var(--color-line)_0,var(--color-line)_1px,transparent_1px,transparent_4px)]"
                />
              )}
            </Link>

            <div className="flex items-center border-r border-line pr-1">
              {quickLinks.map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    aria-label={label}
                    className={cn(
                      "inline-flex h-8 items-center gap-2 px-2 font-mono text-[12px] font-medium transition-[background-color,color]",
                      active
                        ? "bg-muted/60 text-foreground"
                        : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                    )}
                  >
                    <Icon className="size-3.5" aria-hidden />
                    <span className="hidden md:inline">{label}</span>
                  </Link>
                );
              })}
            </div>

            <Link
              href="/excalidraw"
              aria-current={isActive("/excalidraw") ? "page" : undefined}
              aria-label="Canvas"
              className={cn(
                "inline-flex h-8 items-center gap-2 px-2 font-mono text-[12px] font-medium transition-[background-color,color]",
                isActive("/excalidraw")
                  ? "bg-muted/60 text-foreground"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              )}
            >
              <Frame className="size-3.5" aria-hidden />
              <span className="hidden md:inline">Canvas</span>
            </Link>

            <div className="ml-auto flex items-center">
              <div className="hidden items-center border-r border-line pr-2 md:flex">
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

              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-2 border-r border-line border-none px-2 font-mono text-[12px] font-medium hover:bg-transparent"
                asChild
              >
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub"
                  className="border-r border-line pr-2"
                >
                  <Icons.gitHub className="size-4" />
                  <span className="hidden md:inline-block">1.6k</span>
                </a>
              </Button>

              <section
                aria-label="Theme and profile controls"
                className="flex items-center"
              >
                <ThemeToggle />
                <HeaderProfileMenu />
              </section>
            </div>
          </div>

          <nav
            aria-label="Primary navigation"
            className="grid h-8 grid-cols-5 border-t border-line"
          >
            {railItems.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "flex min-w-0 items-center justify-center border-line px-1 font-mono text-[10px] font-medium tracking-[0.08em] uppercase transition-[background-color,color] sm:text-[11px]",
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
