"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  Briefcase,
  FolderKanban,
  LayoutDashboard,
  LayoutList,
  Link2,
  LogOut,
  Mail,
  Menu,
  Settings,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/overview", label: "Overview", icon: LayoutList },
  { href: "/admin/socials", label: "Socials", icon: Link2 },
  { href: "/admin/projects", label: "Projects", icon: FolderKanban },
  { href: "/admin/skills", label: "Skills", icon: Sparkles },
  { href: "/admin/blog", label: "Blog", icon: BookOpen },
  { href: "/admin/experience", label: "Experience", icon: Briefcase },
  { href: "/admin/contact", label: "Contact", icon: Mail },
  { href: "/admin/site-settings", label: "Site Settings", icon: Settings },
];

function NavList({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-(--sidebar-primary) text-(--sidebar-primary-foreground)"
                : "text-(--sidebar-foreground) hover:bg-(--sidebar-accent) hover:text-(--sidebar-accent-foreground)",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminShell({
  email,
  children,
}: {
  email: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await authClient.signOut();
    toast.success("Signed out");
    router.push("/admin/login");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-(--sidebar-border) bg-(--sidebar) p-4 md:flex">
        <div className="mb-6 px-3">
          <Link href="/admin" className="block">
            <div className="text-lg font-semibold tracking-tight text-(--primary)">
              PORTO Admin
            </div>
            <div className="text-xs text-(--muted-foreground)">
              Content management
            </div>
          </Link>
        </div>
        <NavList pathname={pathname} />
        <div className="mt-auto border-t border-(--sidebar-border) pt-3">
          <div className="px-3 py-2 text-xs text-(--muted-foreground)">
            Signed in as
          </div>
          <div className="px-3 pb-3 text-sm font-medium break-all">{email}</div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start gap-2"
          >
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-(--border) bg-(--background)/80 px-4 backdrop-blur md:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-4">
              <SheetTitle className="mb-4 text-(--primary)">
                PORTO Admin
              </SheetTitle>
              <NavList
                pathname={pathname}
                onNavigate={() => setMobileOpen(false)}
              />
            </SheetContent>
          </Sheet>
          <div className="text-sm font-medium text-(--foreground)">
            {navItems.find((i) =>
              i.exact ? pathname === i.href : pathname.startsWith(i.href),
            )?.label ?? "Admin"}
          </div>
          <div className="ml-auto text-xs text-(--muted-foreground) md:hidden">
            {email}
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
