import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "../db/index.js";
import { aiToolSettings, user } from "../db/schema/index.js";

const TOKEN_PREFIX = "porto_mcp_";

// Buat token MCP baru bergaya `porto_mcp_<random>`.
export function generateMcpTokenValue(): string {
  return `${TOKEN_PREFIX}${randomBytes(24).toString("base64url")}`;
}

export function hashMcpToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Bandingkan hash token kandidat dengan hash tersimpan secara constant-time.
export async function validateMcpToken(token: string): Promise<boolean> {
  if (!token) return false;
  const [settings] = await db
    .select({ mcpTokenHash: aiToolSettings.mcpTokenHash })
    .from(aiToolSettings)
    .where(eq(aiToolSettings.id, 1))
    .limit(1);
  const storedHash = settings?.mcpTokenHash;
  if (!storedHash) return false;

  const candidate = Buffer.from(hashMcpToken(token), "hex");
  const stored = Buffer.from(storedHash, "hex");
  if (candidate.length !== stored.length) return false;
  return timingSafeEqual(candidate, stored);
}

// Resolusi identitas admin untuk jalur Bearer (token == admin tunggal).
export async function resolveAdminUser(): Promise<{
  id: string;
  email: string;
} | null> {
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  if (adminEmail) {
    const [row] = await db
      .select({ id: user.id, email: user.email })
      .from(user)
      .where(eq(user.email, adminEmail))
      .limit(1);
    if (row) return row;
  }
  const [byRole] = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(eq(user.role, "admin"))
    .limit(1);
  return byRole ?? null;
}
