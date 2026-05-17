import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const experienceCompanies = pgTable("experience_companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  website: text("website"),
  location: text("location"),
  logoUrl: text("logo_url"),
  isCurrent: boolean("is_current").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const experiencePositions = pgTable("experience_positions", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id")
    .notNull()
    .references(() => experienceCompanies.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  employmentType: text("employment_type"),
  period: text("period"),
  periodStart: text("period_start"),
  periodEnd: text("period_end"),
  description: text("description"),
  achievements: jsonb("achievements").$type<string[]>().notNull().default([]),
  technologies: jsonb("technologies").$type<string[]>().notNull().default([]),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
