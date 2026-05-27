"use client";

import { LayoutDashboard, LogOut, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

function getInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.split("@")[0]?.trim() || "User";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length > 1) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function HeaderProfileMenu() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const dashboardHref = user?.email === adminEmail ? "/admin" : "/dashboard";
  const initials = getInitials(user?.name, user?.email);

  async function handleLogout() {
    await authClient.signOut();
    toast.success("Signed out");
    router.push("/login");
    router.refresh();
  }

  const triggerClassName = cn(
    "h-8 gap-2 rounded-none border-l border-line px-2 font-mono text-[12px] font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground",
    "data-[state=open]:bg-muted/60 data-[state=open]:text-foreground",
  );

  if (!user) {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled={isPending}
        aria-label="Open profile"
        className={triggerClassName}
        onClick={() => router.push("/login?redirect=/dashboard")}
      >
        <span className="inline-flex size-5 items-center justify-center border border-line text-[10px]">
          <UserRound className="size-3" aria-hidden />
        </span>
        <span className="hidden lg:inline">Profile</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Open profile menu"
          className={triggerClassName}
        >
          <span className="inline-flex size-5 items-center justify-center border border-line text-[10px]">
            {initials}
          </span>
          <span className="hidden max-w-28 truncate lg:inline">
            {user.name || user.email}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-56 rounded-none border border-line bg-background p-1 font-mono shadow-none"
      >
        <DropdownMenuLabel className="rounded-none px-2 py-2">
          <span className="block text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
            Signed in
          </span>
          <span className="mt-1 block truncate text-[12px] text-foreground">
            {user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-line" />
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => router.push(dashboardHref)}
            className="rounded-none text-[12px]"
          >
            <LayoutDashboard className="size-3.5" aria-hidden />
            Dashboard
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleLogout}
            className="rounded-none text-[12px]"
          >
            <LogOut className="size-3.5" aria-hidden />
            Logout
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
