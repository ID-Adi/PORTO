import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth.js";

/**
 * Tabel terpisah dari `media` (yang merupakan asset library admin).
 * `tool_generation` menyimpan output AI generator per-user (image/video) supaya
 * akun non-admin tidak mencemari pustaka media yang dipakai admin di project,
 * blog, dst. Lihat plan: /Users/bravo/.claude/plans/...
 */
export const toolGeneration = pgTable("tool_generation", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // "image" | "video"
  prompt: text("prompt").notNull(),
  aspectRatio: text("aspect_ratio").notNull(),
  fileUrl: text("file_url"),
  mimeType: text("mime_type"),
  fileSize: integer("file_size"),
  requestId: text("request_id"),
  status: text("status").notNull().default("success"), // "success" | "error"
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
