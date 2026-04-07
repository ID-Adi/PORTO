import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const profileEntries = pgTable(
  "profile_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    slugIdx: index("profile_entries_slug_idx").on(table.slug),
  }),
);

export type ProfileEntry = typeof profileEntries.$inferSelect;
export type NewProfileEntry = typeof profileEntries.$inferInsert;
