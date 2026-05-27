"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteHeader } from "@/layout/site-header";

function safeRedirect(target: string | null): string {
  if (!target) return "/dashboard";
  // Hanya izinkan relative path internal supaya tidak open-redirect.
  if (!target.startsWith("/") || target.startsWith("//")) return "/dashboard";
  return target;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirect(searchParams.get("redirect"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (searchParams.get("reset") === "success") {
      toast.success(
        "Password berhasil diubah. Silakan login dengan password baru.",
        { duration: 6000 },
      );
      // Bersihkan param dari URL tanpa reload halaman
      const url = new URL(window.location.href);
      url.searchParams.delete("reset");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const { error } = await authClient.signIn.email({ email, password });
      if (error) {
        toast.error(error.message ?? "Sign-in failed");
        return;
      }
      toast.success("Signed in");
      router.push(redirectTo);
      router.refresh();
    } catch {
      toast.error("Cannot reach the auth server. Check backend and CORS.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="max-w-screen overflow-x-hidden px-2">
        <div className="page-frame">
          <section className="min-h-[calc(100vh-5rem)] border-x border-line">
            <div className="grid min-h-[calc(100vh-5rem)] place-items-center px-4 py-12">
              <div className="w-full max-w-sm border border-line bg-background">
                <div className="border-b border-line p-6 text-center">
                  <div className="mx-auto mb-3 flex size-10 items-center justify-center border border-line bg-muted/40">
                    <LogIn className="size-5" />
                  </div>
                  <h1 className="font-mono text-xl font-semibold tracking-[0.08em] uppercase">
                    PORTO Login
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Sign in to access your dashboard and tools.
                  </p>
                </div>
                <form onSubmit={onSubmit} className="space-y-4 p-6">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="username"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => router.push("/change-password")}
                      className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase underline-offset-4 transition-colors hover:text-foreground hover:underline"
                    >
                      Change password
                    </button>
                  </div>
                  <Button
                    type="submit"
                    disabled={pending}
                    className="w-full rounded-none font-mono text-[12px] tracking-[0.12em] uppercase"
                  >
                    {pending ? "Signing in…" : "Sign in"}
                  </Button>
                </form>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-(--muted-foreground)">
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
