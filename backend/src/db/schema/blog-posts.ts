import { boolean, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Kategori blog. `global` = artikel editorial/teknis biasa.
 * `saham_crypto` = laporan runtime harian gabungan Saham & Crypto (legacy tool
 * `blog_propose_saham_crypto_daily`).
 * `saham` / `crypto` = draft pasar terpisah dari runtime MCP market-blog
 * (`market_blog_create_stock_draft` / `market_blog_create_crypto_draft`).
 * Codebase tidak memakai pgEnum, jadi disimpan sebagai text dengan validasi
 * ketat di zod (tRPC & MCP) — menambah nilai di sini tidak perlu migrasi.
 */
export const BLOG_CATEGORIES = [
  "global",
  "saham_crypto",
  "saham",
  "crypto",
] as const;
export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

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
