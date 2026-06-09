import { boolean, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Kategori blog. `global` = artikel editorial/teknis biasa.
 * `saham_crypto` = laporan runtime harian Saham & Crypto.
 * `learning` = catatan belajar, riset, dan breakdown konsep.
 * Codebase tidak memakai pgEnum, jadi disimpan sebagai text dengan validasi
 * ketat di zod (tRPC & MCP) — menambah nilai di sini tidak perlu migrasi.
 */
export const BLOG_CATEGORIES = [
  "global",
  "saham_crypto",
  "learning",
] as const;
export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

/**
 * Normalisasi nilai kategori sebelum validasi enum. Alias legacy untuk rename:
 * `study` lama dipetakan ke `learning` agar draft/agent yang masih mengirim
 * `study` tetap lolos pasca-rename. Catatan: `saham`/`crypto` SENGAJA tidak
 * dipetakan — draft pending legacy bercategory tersebut di-reject manual lewat
 * dashboard /admin/mcp.
 */
export function normalizeBlogCategory(value: unknown): unknown {
  return value === "study" ? "learning" : value;
}

export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  content: text("content"),
  meta: text("meta"),
  category: text("category").notNull().default("global"),
  coverUrl: text("cover_url"),
  published: boolean("published").notNull().default(false),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
