"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail } from "lucide-react";
import { toast } from "sonner";

import { BACKEND_URL } from "@/lib/backend-url";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SendCodeForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/send-reset-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const body = (await res.json()) as {
        success?: boolean;
        message?: string;
        error?: string;
      };

      if (!res.ok || body.error) {
        toast.error(body.error ?? "Gagal mengirim kode");
        return;
      }

      toast.success(body.message ?? "Kode verifikasi telah dikirim");
      router.push(
        `/change-password/verify?email=${encodeURIComponent(email.trim())}`,
      );
    } catch {
      toast.error("Tidak dapat terhubung ke server");
    } finally {
      setPending(false);
    }
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
                  <Mail className="size-5" />
                </div>
                <h1 className="font-mono text-xl font-semibold tracking-[0.08em] uppercase">
                  Change Password
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Masukkan email Anda untuk menerima kode verifikasi.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={onSubmit} className="space-y-4 p-6">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="anda@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={pending}
                  className="w-full rounded-none font-mono text-[12px] tracking-[0.12em] uppercase"
                >
                  {pending ? "Mengirim…" : "Kirim Kode Verifikasi"}
                </Button>
              </form>

              {/* Footer */}
              <div className="border-t border-line p-4 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase underline-offset-4 transition-colors hover:text-foreground hover:underline"
                >
                  <ArrowLeft className="size-3" />
                  Kembali ke Login
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function ChangePasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <SendCodeForm />
    </Suspense>
  );
}
