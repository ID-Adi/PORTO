"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import { AdminShell } from "@/features/admin/components/admin-shell";

const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-(--muted-foreground)">
        Loading…
      </div>
    );
  }

  if (!session?.user) {
    if (typeof window !== "undefined") {
      router.replace("/admin/login");
    }
    return null;
  }

  if (adminEmail && session.user.email !== adminEmail) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-xl font-semibold">Forbidden</h1>
        <p className="text-sm text-(--muted-foreground)">
          You are signed in as {session.user.email}, but only the configured
          admin can access this area.
        </p>
        <button
          type="button"
          onClick={async () => {
            await authClient.signOut();
            router.push("/admin/login");
          }}
          className="text-sm text-(--primary) underline"
        >
          Sign out
        </button>
      </div>
    );
  }

  return <AdminShell email={session.user.email}>{children}</AdminShell>;
}
