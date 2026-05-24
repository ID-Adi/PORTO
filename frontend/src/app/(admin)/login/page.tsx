"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function safeRedirect(target: string | null): string {
  if (!target) return "/admin";
  // Hanya izinkan relative path internal supaya tidak open-redirect.
  if (!target.startsWith("/") || target.startsWith("//")) return "/admin";
  return target;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirect(searchParams.get("redirect"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

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
    <div className="flex min-h-screen items-center justify-center bg-(--background) px-4">
      <div className="w-full max-w-sm rounded-lg border border-(--border) bg-(--card) p-6 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-md bg-(--primary) text-(--primary-foreground)">
            <LogIn className="size-5" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">
            PORTO Admin
          </h1>
          <p className="mt-1 text-sm text-(--muted-foreground)">
            Sign in to manage portfolio content
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
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
          </div>
          <Button
            type="submit"
            disabled={pending}
            className="w-full bg-(--primary) text-(--primary-foreground) hover:bg-(--primary)/90"
          >
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
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
