"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Eye, EyeOff, Lock } from "lucide-react";
import { toast } from "sonner";

import { BACKEND_URL } from "@/lib/backend-url";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function NewPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);

  const passwordMatch =
    newPassword && confirmPassword && newPassword === confirmPassword;
  const passwordValid = newPassword.length >= 8;
  const canSubmit = passwordValid && passwordMatch;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      toast.error("Token tidak ditemukan. Silakan mulai dari awal.");
      router.push("/change-password");
      return;
    }
    setPending(true);
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/auth/reset-password-code`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, newPassword }),
        },
      );

      const body = (await res.json()) as {
        success?: boolean;
        message?: string;
        error?: string;
      };

      if (!res.ok || body.error) {
        toast.error(body.error ?? "Gagal mengubah password");
        return;
      }

      toast.success("Password berhasil diubah");
      router.push("/login?reset=success");
    } catch {
      toast.error("Tidak dapat terhubung ke server");
    } finally {
      setPending(false);
    }
  }

  if (!token) {
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
                  <Lock className="size-5" />
                </div>
                <h1 className="font-mono text-xl font-semibold tracking-[0.08em] uppercase">
                  Password Baru
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Masukkan password baru untuk akun Anda.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={onSubmit} className="space-y-4 p-6">
                {/* New Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="new-password">Password Baru</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      placeholder="Minimal 8 karakter"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? "Sembunyikan" : "Tampilkan"}
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                  {newPassword && !passwordValid && (
                    <p className="text-[11px] text-red-400">
                      Password minimal 8 karakter.
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password">Ulangi Password Baru</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      placeholder="Masukkan ulang password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    {passwordMatch && (
                      <Check className="absolute right-2 top-1/2 size-4 -translate-y-1/2 text-green-400" />
                    )}
                  </div>
                  {confirmPassword && !passwordMatch && (
                    <p className="text-[11px] text-red-400">
                      Password tidak cocok.
                    </p>
                  )}
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/login")}
                    className="flex-1 rounded-none border-line font-mono text-[12px] tracking-[0.12em] uppercase"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={pending || !canSubmit}
                    className="flex-1 rounded-none font-mono text-[12px] tracking-[0.12em] uppercase"
                  >
                    {pending ? "Menyimpan…" : "Simpan"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function NewPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <NewPasswordForm />
    </Suspense>
  );
}
