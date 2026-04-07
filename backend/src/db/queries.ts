import { sql } from "drizzle-orm";

import { getDatabase } from "./client";

export type DatabaseStatus =
  | { ok: true; driver: "postgres"; now: string }
  | { ok: false; reason: "missing_database_url" | "connection_failed"; message: string };

export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  if (!process.env.DATABASE_URL) {
    return {
      ok: false,
      reason: "missing_database_url",
      message: "Set DATABASE_URL to enable PostgreSQL access.",
    };
  }

  try {
    const db = getDatabase();
    const result = await db.execute<{ now: Date }>(sql`select now() as now`);
    const current = result[0]?.now;

    return {
      ok: true,
      driver: "postgres",
      now: current instanceof Date ? current.toISOString() : new Date().toISOString(),
    };
  } catch (error) {
    return {
      ok: false,
      reason: "connection_failed",
      message: error instanceof Error ? error.message : "Unknown database error.",
    };
  }
}
