import { sql } from "drizzle-orm";

import { db } from "../db/index.js";

/**
 * Backfill one-time pasca rename kategori blog `study` -> `learning` dan
 * penggabungan legacy `saham`/`crypto` -> `saham_crypto`.
 *
 * Kolom `category` adalah plain text (bukan pgEnum), jadi rename di kode tidak
 * menyentuh baris yang sudah ada — skrip ini yang menyelaraskannya.
 *
 * Catatan keputusan: baris PENDING di `mcp_action_requests` yang masih
 * bercategory `saham`/`crypto` SENGAJA tidak disentuh — di-reject manual lewat
 * dashboard /admin/mcp. Hanya `study` -> `learning` yang dinormalkan agar draft
 * study lama tetap bisa di-approve.
 */
async function backfill() {
  console.log("Backfill kategori blog dimulai...\n");

  const learningPosts = await db.execute(
    sql`UPDATE blog_posts SET category = 'learning', updated_at = now() WHERE category = 'study'`,
  );
  console.log(
    `blog_posts: study -> learning  (${learningPosts.count ?? 0} baris)`,
  );

  const sahamCryptoPosts = await db.execute(
    sql`UPDATE blog_posts SET category = 'saham_crypto', updated_at = now() WHERE category IN ('saham', 'crypto')`,
  );
  console.log(
    `blog_posts: saham|crypto -> saham_crypto  (${sahamCryptoPosts.count ?? 0} baris)`,
  );

  const pendingStudy = await db.execute(
    sql`UPDATE mcp_action_requests
        SET payload = jsonb_set(payload, '{category}', '"learning"'), updated_at = now()
        WHERE domain = 'blog'
          AND action = 'blog_propose_create'
          AND status = 'pending'
          AND payload->>'category' = 'study'`,
  );
  console.log(
    `mcp_action_requests (pending): study -> learning  (${pendingStudy.count ?? 0} baris)`,
  );

  // Hanya informatif: laporkan berapa draft pending legacy saham/crypto yang
  // dibiarkan untuk di-reject manual.
  const leftover = await db.execute(
    sql`SELECT count(*)::int AS n FROM mcp_action_requests
        WHERE domain = 'blog'
          AND action = 'blog_propose_create'
          AND status = 'pending'
          AND payload->>'category' IN ('saham', 'crypto')`,
  );
  const leftoverCount = (leftover as unknown as Array<{ n: number }>)[0]?.n ?? 0;
  console.log(
    `\nDraft pending legacy saham/crypto yang dibiarkan (reject manual): ${leftoverCount}`,
  );

  console.log("\nSelesai.");
  process.exit(0);
}

backfill().catch((err) => {
  console.error(err);
  process.exit(1);
});
