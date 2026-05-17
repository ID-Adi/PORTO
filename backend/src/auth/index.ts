import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "../db/index.js";

const trustedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  ...(process.env.FRONTEND_URL?.split(",").map((s) => s.trim()) ?? []),
].filter((value): value is string => Boolean(value));

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins,
  advanced: process.env.COOKIE_DOMAIN
    ? {
        crossSubDomainCookies: {
          enabled: true,
          domain: process.env.COOKIE_DOMAIN,
        },
      }
    : undefined,
});
