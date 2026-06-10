import { promises as fs } from "node:fs";
import path from "node:path";

import { gt, inArray, ne, sql } from "drizzle-orm";

import { db } from "../db/index.js";
import { toolGeneration } from "../db/schema/index.js";
import type { ToolReferenceImage } from "../db/schema/tool-generation.js";
import { TOOLS_REFS_DIR, TOOLS_UPLOAD_DIR } from "./uploads-dir.js";

/**
 * Retensi history /tools: tanpa ini, row `tool_generation` + file di
 * `uploads/tools` tumbuh tanpa batas (UI hanya menampilkan & bisa menghapus
 * 50 terbaru per kind, sisanya tak terjangkau user).
 *
 * Kebijakan: simpan KEEP_PER_USER_KIND row terbaru per user × kind, sisanya
 * dihapus beserta file output + file referensinya. Row `pending` tidak pernah
 * disentuh (job video/TTS yang masih jalan; yang macet ditangani reaper di
 * tools.ts).
 */
const KEEP_PER_USER_KIND = 50;
const SWEEP_INTERVAL_MS = 60 * 60_000;
// Tunda sweep pertama agar tidak bersaing dengan startup/migrasi.
const SWEEP_INITIAL_DELAY_MS = 30_000;
// Batasi per putaran supaya unlink file tidak memblok event loop terlalu lama;
// backlog besar akan habis dalam beberapa putaran berikutnya.
const SWEEP_BATCH = 200;

async function unlinkContained(baseDir: string, basename: string) {
  const resolved = path.resolve(path.join(baseDir, path.basename(basename)));
  if (!resolved.startsWith(baseDir + path.sep)) return;
  await fs.unlink(resolved).catch(() => {
    // file sudah tidak ada — abaikan
  });
}

async function removeRowFiles(row: typeof toolGeneration.$inferSelect) {
  if (row.fileUrl?.startsWith("/uploads/tools/")) {
    await unlinkContained(TOOLS_UPLOAD_DIR, path.basename(row.fileUrl));
  }
  const refs = Array.isArray(row.referenceImages)
    ? (row.referenceImages as ToolReferenceImage[])
    : [];
  for (const ref of refs) {
    const match = (ref.url ?? "").match(/\/uploads\/tools\/refs\/([^?#/]+)$/);
    if (!match) continue;
    await unlinkContained(TOOLS_REFS_DIR, match[1]);
  }
}

export async function sweepToolGenerationsOnce(): Promise<number> {
  const ranked = db.$with("ranked").as(
    db
      .select({
        id: toolGeneration.id,
        rn: sql<number>`row_number() over (partition by ${toolGeneration.userId}, ${toolGeneration.kind} order by ${toolGeneration.createdAt} desc)`.as(
          "rn",
        ),
      })
      .from(toolGeneration)
      .where(ne(toolGeneration.status, "pending")),
  );

  const stale = await db
    .with(ranked)
    .select({ id: ranked.id })
    .from(ranked)
    .where(gt(ranked.rn, KEEP_PER_USER_KIND))
    .limit(SWEEP_BATCH);

  if (stale.length === 0) return 0;

  const ids = stale.map((row) => row.id);
  const rows = await db
    .select()
    .from(toolGeneration)
    .where(inArray(toolGeneration.id, ids));

  for (const row of rows) {
    await removeRowFiles(row);
  }

  await db.delete(toolGeneration).where(inArray(toolGeneration.id, ids));
  return ids.length;
}

export function startToolRetentionSweeper() {
  const run = () => {
    sweepToolGenerationsOnce()
      .then((pruned) => {
        if (pruned > 0) {
          console.log(`[tool-retention] pruned ${pruned} stale generations`);
        }
      })
      .catch((err: unknown) => {
        console.warn(
          "[tool-retention] sweep failed:",
          err instanceof Error ? err.message : String(err),
        );
      });
  };

  setTimeout(run, SWEEP_INITIAL_DELAY_MS).unref();
  setInterval(run, SWEEP_INTERVAL_MS).unref();
}
