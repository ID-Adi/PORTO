import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth.js";

export type CanvasAgentFrameRef = {
  id: string;
  name: string | null;
  mention: string;
  elementIds: string[];
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

export type CanvasAgentMetadata = Record<string, unknown>;

// Scene Excalidraw per workflow: { elements, appState, files }. Bentuk opaque
// (disimpan apa adanya seperti canvas_documents.sceneData lama).
export type CanvasAgentSceneData = Record<string, unknown>;

export type CanvasAgentChange =
  | { type: "add"; element: unknown }
  | { type: "update"; elementId: string; patch: Record<string, unknown> }
  | { type: "delete"; elementId: string };

export const canvasAgentWorkflows = pgTable("canvas_agent_workflows", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  status: text("status").notNull().default("active"),
  isPinned: boolean("is_pinned").notNull().default(false),
  activeFrameIds: jsonb("active_frame_ids")
    .$type<string[]>()
    .notNull()
    .default([]),
  metadata: jsonb("metadata")
    .$type<CanvasAgentMetadata>()
    .notNull()
    .default({}),
  // Scene canvas (Excalidraw) milik workflow ini — menyatukan canvas + agent chat.
  sceneData: jsonb("scene_data").$type<CanvasAgentSceneData>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const canvasAgentMessages = pgTable("canvas_agent_messages", {
  id: serial("id").primaryKey(),
  workflowId: integer("workflow_id")
    .notNull()
    .references(() => canvasAgentWorkflows.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  frameRefs: jsonb("frame_refs")
    .$type<CanvasAgentFrameRef[]>()
    .notNull()
    .default([]),
  metadata: jsonb("metadata")
    .$type<CanvasAgentMetadata>()
    .notNull()
    .default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const canvasAgentProposals = pgTable("canvas_agent_proposals", {
  id: serial("id").primaryKey(),
  workflowId: integer("workflow_id")
    .notNull()
    .references(() => canvasAgentWorkflows.id, { onDelete: "cascade" }),
  createdFromMessageId: integer("created_from_message_id").references(
    () => canvasAgentMessages.id,
    { onDelete: "set null" },
  ),
  status: text("status").notNull().default("pending_approval"),
  summary: text("summary").notNull(),
  frameIds: jsonb("frame_ids")
    .$type<string[]>()
    .notNull()
    .default([]),
  changes: jsonb("changes")
    .$type<CanvasAgentChange[]>()
    .notNull()
    .default([]),
  errorMessage: text("error_message"),
  appliedAt: timestamp("applied_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
