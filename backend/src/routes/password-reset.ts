import { randomInt, randomUUID } from "node:crypto";
import type { Hono } from "hono";
import { eq, and, gt } from "drizzle-orm";

import { auth } from "../auth/index.js";
import { db } from "../db/index.js";
import { passwordResetCode } from "../db/schema/password-reset.js";
import { user } from "../db/schema/auth.js";
import { SlidingWindowRateLimiter } from "../lib/sliding-window-rate-limit.js";
import { sendMail } from "../lib/mailer.js";

// ---------------------------------------------------------------------------
// Rate limiting: max 3 send-reset-code requests per email per 5 minutes.
// In-memory store — resets on process restart (fine for low-traffic use).
// ---------------------------------------------------------------------------
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX = 3;

const rateLimitStore = new SlidingWindowRateLimiter({
  windowMs: RATE_LIMIT_WINDOW_MS,
  maxHits: RATE_LIMIT_MAX,
  sweepEveryMs: 60_000,
  maxSweepEntries: 100,
});

function checkRateLimit(email: string): boolean {
  const key = `reset:${email.toLowerCase().trim()}`;
  return rateLimitStore.hit(key);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const CODE_EXPIRY_MINUTES = 15;

function generateCode(): string {
  return randomInt(100_000, 1_000_000).toString();
}

// ---------------------------------------------------------------------------
// Register routes directly on the main Hono app (not a sub-router).
// Using a sub-router with app.route() causes Hono to intercept all
// /api/auth/* requests, breaking better-auth's own routes.
// ---------------------------------------------------------------------------
export function registerPasswordResetRoutes(app: Hono): void {
  /**
   * POST /api/auth/send-reset-code
   */
  app.post("/api/auth/send-reset-code", async (c) => {
    try {
      const { email } = await c.req.json<{ email: string }>();

      if (!email || typeof email !== "string") {
        return c.json({ error: "Email is required" }, 400);
      }

      const normalizedEmail = email.toLowerCase().trim();

      const [existing] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, normalizedEmail))
        .limit(1);

      if (!existing) {
        return c.json({
          success: true,
          message:
            "Jika email terdaftar, kode verifikasi akan dikirim ke inbox Anda.",
        });
      }

      if (!checkRateLimit(normalizedEmail)) {
        return c.json(
          { error: "Terlalu banyak permintaan. Silakan coba lagi dalam 5 menit." },
          429,
        );
      }

      const forgetReq = new Request("http://internal/api/auth/forget-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const forgetRes = await auth.handler(forgetReq);

      if (!forgetRes.ok) {
        console.error(
          "[send-reset-code] better-auth forget-password failed:",
          forgetRes.status,
        );
        return c.json({ error: "Gagal membuat kode reset. Silakan coba lagi." }, 500);
      }

      const forgetBody = (await forgetRes.json()) as { token?: string };
      const resetToken = forgetBody?.token;

      if (!resetToken) {
        console.error("[send-reset-code] No token in better-auth response:", forgetBody);
        return c.json({ error: "Gagal membuat kode reset. Silakan coba lagi." }, 500);
      }

      const code = generateCode();
      const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

      await db.insert(passwordResetCode).values({
        id: randomUUID(),
        email: normalizedEmail,
        code,
        token: resetToken,
        expiresAt,
      });

      await sendMail({
        to: normalizedEmail,
        subject: "Kode Verifikasi — Reset Password PORTO",
        text: [
          `Kode verifikasi Anda: ${code}`,
          "",
          `Kode ini berlaku selama ${CODE_EXPIRY_MINUTES} menit.`,
          "Jika Anda tidak meminta reset password, abaikan email ini.",
        ].join("\n"),
      });

      return c.json({
        success: true,
        message: "Jika email terdaftar, kode verifikasi akan dikirim ke inbox Anda.",
      });
    } catch (err) {
      console.error("[send-reset-code] Unexpected error:", err);
      return c.json({ error: "Internal server error" }, 500);
    }
  });

  /**
   * POST /api/auth/verify-reset-code
   */
  app.post("/api/auth/verify-reset-code", async (c) => {
    try {
      const { email, code } = await c.req.json<{ email: string; code: string }>();

      if (!email || !code) {
        return c.json({ error: "Email dan kode harus diisi" }, 400);
      }

      const normalizedEmail = email.toLowerCase().trim();
      const now = new Date();

      const [row] = await db
        .select()
        .from(passwordResetCode)
        .where(
          and(
            eq(passwordResetCode.email, normalizedEmail),
            eq(passwordResetCode.code, code.trim()),
            eq(passwordResetCode.used, false),
            gt(passwordResetCode.expiresAt, now),
          ),
        )
        .limit(1);

      if (!row) {
        return c.json({ error: "Kode tidak valid atau sudah kadaluarsa" }, 400);
      }

      await db
        .update(passwordResetCode)
        .set({ used: true })
        .where(eq(passwordResetCode.id, row.id));

      return c.json({ success: true, token: row.token });
    } catch (err) {
      console.error("[verify-reset-code] Unexpected error:", err);
      return c.json({ error: "Internal server error" }, 500);
    }
  });

  /**
   * POST /api/auth/reset-password-code
   */
  app.post("/api/auth/reset-password-code", async (c) => {
    try {
      const { token, newPassword } = await c.req.json<{
        token: string;
        newPassword: string;
      }>();

      if (!token || !newPassword) {
        return c.json({ error: "Token dan password baru harus diisi" }, 400);
      }

      if (newPassword.length < 8) {
        return c.json({ error: "Password minimal 8 karakter" }, 400);
      }

      const resetReq = new Request("http://internal/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword, token }),
      });

      const resetRes = await auth.handler(resetReq);

      if (!resetRes.ok) {
        const errBody = await resetRes.json().catch(() => ({}));
        console.error(
          "[reset-password-code] better-auth reset-password failed:",
          resetRes.status,
          errBody,
        );
        return c.json(
          {
            error:
              (errBody as Record<string, unknown>).message ??
              "Gagal mengubah password. Token mungkin sudah kadaluarsa.",
          },
          resetRes.status as 400 | 500,
        );
      }

      const [codeRow] = await db
        .select({ email: passwordResetCode.email })
        .from(passwordResetCode)
        .where(eq(passwordResetCode.token, token))
        .limit(1);

      if (codeRow?.email) {
        await sendMail({
          to: codeRow.email,
          subject: "Password Berhasil Diubah — PORTO",
          text: [
            "Password akun PORTO Anda telah berhasil diubah.",
            "",
            "Jika Anda yang melakukan perubahan ini, tidak perlu melakukan tindakan lebih lanjut.",
            "Jika Anda TIDAK merasa melakukan perubahan ini, segera hubungi administrator.",
          ].join("\n"),
        });
      }

      return c.json({ success: true, message: "Password berhasil diubah" });
    } catch (err) {
      console.error("[reset-password-code] Unexpected error:", err);
      return c.json({ error: "Internal server error" }, 500);
    }
  });
}
