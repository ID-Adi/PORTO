import {
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth.js";

export type ToolReferenceImage = {
  url: string;
  mimeType: string;
};

export type ToolReferenceMapping = Record<string, number>;

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
  status: text("status").notNull().default("success"), // "pending" | "success" | "error"
  errorMessage: text("error_message"),
  operationName: text("operation_name"),
  // Untuk image-edit/multi-ref: array {url, mimeType} dari referensi yang
  // dikirim ke pipeline. Disimpan agar history bisa rebuild UI referensi.
  referenceImages: jsonb("reference_images")
    .$type<ToolReferenceImage[]>()
    .notNull()
    .default([]),
  // Mapping tag `@N` di prompt ke index pada referenceImages, mis. {"@1": 0}.
  referenceMapping: jsonb("reference_mapping")
    .$type<ToolReferenceMapping>()
    .notNull()
    .default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
