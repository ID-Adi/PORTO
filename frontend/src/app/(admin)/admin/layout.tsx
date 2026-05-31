"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import { AdminShell } from "@/features/admin/components/admin-shell";

const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.replace("/login?redirect=/admin");
    }
  }, [isPending, router, session?.user]);

  if (isPending) {
    return (
      <div className="admin-theme font-sans antialiased">
        <div className="flex min-h-screen items-center justify-center text-sm text-(--muted-foreground)">
          Loading…
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  // Otorisasi utama lewat role DB (dikembalikan Better Auth di session);
  // email == NEXT_PUBLIC_ADMIN_EMAIL dipertahankan sebagai fallback.
  const role = (session.user as { role?: string }).role;
  const isAdmin =
    role === "admin" || (!!adminEmail && session.user.email === adminEmail);
  if (!isAdmin) {
    return (
      <div className="admin-theme font-sans antialiased">
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
              router.push("/login");
            }}
            className="text-sm text-(--primary) underline"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-theme font-sans antialiased">
      <AdminShell email={session.user.email}>{children}</AdminShell>
    </div>
  );
}
