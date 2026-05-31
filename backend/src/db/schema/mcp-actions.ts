import {
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth.js";

export type McpActionDomain = "blog" | "tools.image" | "canvas";
export type McpActionStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "running"
  | "succeeded"
  | "failed";
export type McpActionPayload = Record<string, unknown>;
export type McpActionResult = Record<string, unknown>;

export const mcpActionRequests = pgTable("mcp_action_requests", {
  id: serial("id").primaryKey(),
  domain: text("domain").$type<McpActionDomain>().notNull(),
  action: text("action").notNull(),
  status: text("status").$type<McpActionStatus>().notNull().default("pending"),
  payload: jsonb("payload").$type<McpActionPayload>().notNull().default({}),
  result: jsonb("result").$type<McpActionResult>().notNull().default({}),
  requestedBy: text("requested_by").references(() => user.id, {
    onDelete: "set null",
  }),
  approvedBy: text("approved_by").references(() => user.id, {
    onDelete: "set null",
  }),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  approvedAt: timestamp("approved_at"),
  completedAt: timestamp("completed_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
