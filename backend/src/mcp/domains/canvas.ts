import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../../db/index.js";
import {
  canvasAgentWorkflows,
  mcpActionRequests,
} from "../../db/schema/index.js";
import type { PortoMcpRegistry } from "../registry.js";

const workflowSummaryColumns = {
  id: canvasAgentWorkflows.id,
  userId: canvasAgentWorkflows.userId,
  title: canvasAgentWorkflows.title,
  status: canvasAgentWorkflows.status,
  isPinned: canvasAgentWorkflows.isPinned,
  activeFrameIds: canvasAgentWorkflows.activeFrameIds,
  metadata: canvasAgentWorkflows.metadata,
  createdAt: canvasAgentWorkflows.createdAt,
  updatedAt: canvasAgentWorkflows.updatedAt,
} as const;

export function registerCanvasMcp(registry: PortoMcpRegistry) {
  registry.resources.push(
    {
      name: "canvas_workflow",
      title: "Canvas Workflow",
      uriTemplate: "porto://canvas/workflow/{workflowId}",
      description: "Ringkasan workflow canvas dan scene summary.",
      read: async (context, variables) => {
        const workflowId = Number(variables.workflowId);
        const [workflow] = await db
          .select({
            ...workflowSummaryColumns,
            sceneData: canvasAgentWorkflows.sceneData,
          })
          .from(canvasAgentWorkflows)
          .where(
            context.userId
              ? and(
                  eq(canvasAgentWorkflows.id, workflowId),
                  eq(canvasAgentWorkflows.userId, context.userId),
                )
              : eq(canvasAgentWorkflows.id, workflowId),
          )
          .limit(1);
        if (!workflow) return { workflow: null };
        return {
          workflow: {
            ...workflow,
            sceneSummary: summarizeScene(workflow.sceneData),
            sceneData: undefined,
          },
        };
      },
    },
    {
      name: "canvas_workflow_frame",
      title: "Canvas Workflow Frame",
      uriTemplate: "porto://canvas/workflow/{workflowId}/frame/{frameId}",
      description: "Frame Excalidraw tertentu beserta elemen di dalamnya.",
      read: async (context, variables) => {
        return readCanvasFrame({
          workflowId: Number(variables.workflowId),
          frameId: variables.frameId,
          userId: context.userId,
        });
      },
    },
  );

  registry.tools.push(
    {
      name: "canvas_read_frame",
      title: "Read Canvas Frame",
      description: "Membaca frame canvas dan elemen target secara read-only.",
      inputSchema: {
        workflowId: z.number().int().positive(),
        frameId: z.string().min(1),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
      execute: async (context, input) => {
        const parsed = z
          .object({
            workflowId: z.number().int().positive(),
            frameId: z.string().min(1),
          })
          .parse(input);
        return readCanvasFrame({
          workflowId: parsed.workflowId,
          frameId: parsed.frameId,
          userId: context.userId,
        });
      },
    },
    {
      name: "canvas_create_proposal",
      title: "Create Canvas Proposal",
      description: "Membuat approval request untuk proposal patch canvas.",
      inputSchema: {
        workflowId: z.number().int().positive(),
        summary: z.string().min(1).max(2000),
        frameIds: z.array(z.string().min(1)).max(50).default([]),
        changes: z.array(z.unknown()).max(200).default([]),
      },
      annotations: { openWorldHint: false },
      execute: async (context, input) => {
        const parsed = z
          .object({
            workflowId: z.number().int().positive(),
            summary: z.string().min(1).max(2000),
            frameIds: z.array(z.string().min(1)).max(50).default([]),
            changes: z.array(z.unknown()).max(200).default([]),
          })
          .parse(input);
        const [row] = await db
          .insert(mcpActionRequests)
          .values({
            domain: "canvas",
            action: "canvas_create_proposal",
            requestedBy: context.requestedBy,
            payload: parsed,
          })
          .returning();
        return row;
      },
    },
    {
      name: "canvas_enrich_frame_metadata",
      title: "Enrich Canvas Frame Metadata",
      description:
        "Membuat approval request untuk update customData frame Excalidraw.",
      inputSchema: {
        workflowId: z.number().int().positive(),
        frameId: z.string().min(1),
        customData: z.record(z.string(), z.unknown()),
        summary: z.string().max(2000).optional(),
      },
      annotations: { openWorldHint: false },
      execute: async (context, input) => {
        const parsed = z
          .object({
            workflowId: z.number().int().positive(),
            frameId: z.string().min(1),
            customData: z.record(z.string(), z.unknown()),
            summary: z.string().max(2000).optional(),
          })
          .parse(input);
        const [row] = await db
          .insert(mcpActionRequests)
          .values({
            domain: "canvas",
            action: "canvas_enrich_frame_metadata",
            requestedBy: context.requestedBy,
            payload: parsed,
          })
          .returning();
        return row;
      },
    },
  );
}

async function readCanvasFrame(args: {
  workflowId: number;
  frameId: string;
  userId: string | null;
}) {
  const [workflow] = await db
    .select({
      id: canvasAgentWorkflows.id,
      title: canvasAgentWorkflows.title,
      sceneData: canvasAgentWorkflows.sceneData,
    })
    .from(canvasAgentWorkflows)
    .where(
      args.userId
        ? and(
            eq(canvasAgentWorkflows.id, args.workflowId),
            eq(canvasAgentWorkflows.userId, args.userId),
          )
        : eq(canvasAgentWorkflows.id, args.workflowId),
    )
    .orderBy(desc(canvasAgentWorkflows.updatedAt))
    .limit(1);

  if (!workflow) return { workflow: null, frame: null, elements: [] };

  const scene = workflow.sceneData as
    | { elements?: Array<Record<string, unknown>> }
    | null
    | undefined;
  const elements = Array.isArray(scene?.elements) ? scene.elements : [];
  const frame =
    elements.find(
      (element) => element.id === args.frameId && element.type === "frame",
    ) ?? null;
  const childElements = elements.filter(
    (element) => element.frameId === args.frameId && element.isDeleted !== true,
  );

  return {
    workflow: { id: workflow.id, title: workflow.title },
    frame,
    elements: childElements,
    elementCount: childElements.length,
  };
}

function summarizeScene(sceneData: unknown) {
  const scene = sceneData as
    | { elements?: Array<Record<string, unknown>>; files?: Record<string, unknown> }
    | null
    | undefined;
  const elements = Array.isArray(scene?.elements) ? scene.elements : [];
  return {
    elementCount: elements.length,
    frameCount: elements.filter((element) => element.type === "frame").length,
    fileCount:
      scene?.files && typeof scene.files === "object"
        ? Object.keys(scene.files).length
        : 0,
  };
}
