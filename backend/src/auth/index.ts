import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "../db/index.js";

const trustedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  ...(process.env.FRONTEND_URL?.split(",").map((s) => s.trim()) ?? []),
].filter((value): value is string => Boolean(value));

// Hanya terima nama domain yang punya minimal satu titik dan TLD ≥ 2 karakter.
// Reject TLD-only (".com") dan IP literal. Leading dot diizinkan (`.pawa.my.id`).
const COOKIE_DOMAIN_PATTERN = /^\.?[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i;

function resolveCookieDomain(): string | undefined {
  const raw = process.env.COOKIE_DOMAIN?.trim();
  if (!raw) return undefined;
  // Cookie cross-subdomain hanya bermakna di production. Di dev (mis.
  // localhost:4002) atribut Domain=… akan ditolak browser dan memutus alur login.
  if (process.env.NODE_ENV !== "production") return undefined;
  if (!COOKIE_DOMAIN_PATTERN.test(raw)) {
    throw new Error(
      `Invalid COOKIE_DOMAIN: "${raw}" — harus berupa domain valid (mis. ".pawa.my.id")`,
    );
  }
  const stripped = raw.replace(/^\./, "");
  if (!stripped.includes(".")) {
    throw new Error(
      `Invalid COOKIE_DOMAIN: "${raw}" — TLD-only domain tidak diizinkan`,
    );
  }
  return raw;
}

const cookieDomain = resolveCookieDomain();
const isProd = process.env.NODE_ENV === "production";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  user: {
    additionalFields: {
      // Role disimpan di DB & dikembalikan dalam session. `input: false`
      // mencegah user menetapkan role sendiri saat signup/update.
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
        input: false,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins,
  advanced: {
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
    },
    ...(cookieDomain
      ? {
          crossSubDomainCookies: {
            enabled: true,
            domain: cookieDomain,
          },
        }
      : {}),
  },
});
