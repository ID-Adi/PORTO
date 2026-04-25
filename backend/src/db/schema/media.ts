import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const media = pgTable("media", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  url: text("url").notNull(),
  mimeType: text("mime_type"),
  size: integer("size"),
  alt: text("alt"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
