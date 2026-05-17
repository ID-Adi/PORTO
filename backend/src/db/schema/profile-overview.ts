import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const profileOverview = pgTable("profile_overview", {
  id: serial("id").primaryKey(),
  position: text("position").notNull().default("left"),
  icon: text("icon").notNull(),
  value: text("value").notNull(),
  kind: text("kind").notNull().default("text"),
  copyable: boolean("copyable").notNull().default(false),
  note: text("note"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
