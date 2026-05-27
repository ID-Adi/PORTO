"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { BACKEND_URL } from "@/lib/backend-url";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function VerifyCodeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email) {
      toast.error("Email tidak ditemukan. Silakan mulai dari awal.");
      router.push("/change-password");
      return;
    }
    setPending(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/verify-reset-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: code.trim() }),
      });

      const body = (await res.json()) as {
        success?: boolean;
        token?: string;
        error?: string;
      };

      if (!res.ok || body.error) {
        toast.error(body.error ?? "Verifikasi gagal");
        return;
      }

      toast.success("Kode valid");
      router.push(
        `/change-password/new?token=${encodeURIComponent(body.token!)}`,
      );
    } catch {
      toast.error("Tidak dapat terhubung ke server");
    } finally {
      setPending(false);
    }
  }

  if (!email) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Sesi tidak valid.</p>
          <Link
            href="/change-password"
            className="mt-4 inline-block font-mono text-[12px] tracking-[0.12em] uppercase underline-offset-4 hover:underline"
          >
            Mulai dari awal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-screen overflow-x-hidden px-2">
      <div className="page-frame">
        <section className="min-h-[calc(100vh-5rem)] border-x border-line">
          <div className="grid min-h-[calc(100vh-5rem)] place-items-center px-4 py-12">
            <div className="w-full max-w-sm border border-line bg-background">
              {/* Header */}
              <div className="border-b border-line p-6 text-center">
                <div className="mx-auto mb-3 flex size-10 items-center justify-center border border-line bg-muted/40">
                  <ShieldCheck className="size-5" />
                </div>
                <h1 className="font-mono text-xl font-semibold tracking-[0.08em] uppercase">
                  Verifikasi Kode
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Kode verifikasi telah dikirim ke{" "}
                  <span className="font-medium text-foreground">{email}</span>
                </p>
              </div>

              {/* Form */}
              <form onSubmit={onSubmit} className="space-y-4 p-6">
                <div className="space-y-1.5">
                  <Label htmlFor="code">Kode Verifikasi</Label>
                  <Input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    placeholder="000000"
                    className="text-center font-mono text-lg tracking-[0.3em]"
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.replace(/\D/g, ""))
                    }
                  />
                </div>

                <Button
                  type="submit"
                  disabled={pending || code.length !== 6}
                  className="w-full rounded-none font-mono text-[12px] tracking-[0.12em] uppercase"
                >
                  {pending ? "Memverifikasi…" : "Verifikasi Kode"}
                </Button>
              </form>

              {/* Footer */}
              <div className="border-t border-line p-4 text-center">
                <Link
                  href="/change-password"
                  className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase underline-offset-4 transition-colors hover:text-foreground hover:underline"
                >
                  <ArrowLeft className="size-3" />
                  Ganti Email
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function VerifyCodePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <VerifyCodeForm />
    </Suspense>
  );
}
