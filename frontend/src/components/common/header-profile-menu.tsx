"use client";

import { LayoutDashboard, LogOut, ShieldCheck, UserRound } from "lucide-react";
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
import { useHasMounted } from "@/hooks/use-has-mounted";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

function ProfileIcon() {
  return (
    <span className="inline-flex size-8 items-center justify-center border border-line transition-colors group-hover/button:border-foreground/40">
      <UserRound className="size-4" aria-hidden />
    </span>
  );
}

export function HeaderProfileMenu() {
  const router = useRouter();
  const mounted = useHasMounted();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const isAdmin = Boolean(adminEmail && user?.email === adminEmail);

  async function handleLogout() {
    await authClient.signOut();
    toast.success("Signed out");
    router.push("/login");
    router.refresh();
  }

  const triggerClassName = cn(
    "h-8 w-8 rounded-none border-none p-0 font-mono text-muted-foreground hover:bg-transparent hover:text-foreground",
    "data-[state=open]:bg-transparent data-[state=open]:text-foreground",
  );

  if (!user) {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled={mounted ? isPending : false}
        aria-label="Open profile"
        className={triggerClassName}
        onClick={() => router.push("/login?redirect=/dashboard")}
      >
        <ProfileIcon />
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
          <ProfileIcon />
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
            onClick={() => router.push("/dashboard")}
            className="rounded-none text-[12px]"
          >
            <LayoutDashboard className="size-3.5" aria-hidden />
            User Dashboard
          </DropdownMenuItem>
          {isAdmin && (
            <DropdownMenuItem
              onClick={() => router.push("/admin")}
              className="rounded-none text-[12px]"
            >
              <ShieldCheck className="size-3.5" aria-hidden />
              Admin Dashboard
            </DropdownMenuItem>
          )}
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
