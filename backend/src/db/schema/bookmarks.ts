import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const bookmarks = pgTable("bookmarks", {
  id: serial("id").primaryKey(),
  period: text("period").notNull(),
  title: text("title").notNull(),
  detail: text("detail"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
