import { TRPCError } from "@trpc/server";
import { and, desc, eq, lt } from "drizzle-orm";
import { z } from "zod";

import { db } from "../../db/index.js";
import {
  aiToolSettings,
  canvasAgentMessages,
  canvasAgentProposals,
  canvasAgentRuns,
  canvasAgentWorkflows,
} from "../../db/schema/index.js";
import { enqueueCanvasAgentRun } from "../../lib/canvas-agent-runner.js";
import { authenticatedProcedure, router } from "../init.js";

const WORKFLOW_TITLE_MAX = 120;
const MESSAGE_CONTENT_MAX = 12_000;
const MAX_FRAME_REFS = 50;
const MAX_PROPOSAL_CHANGES = 200;

const workflowStatus = z.enum(["active", "archived"]);
const messageRole = z.enum(["user", "assistant", "system"]);
const proposalStatus = z.enum([
  "pending_approval",
  "approved",
  "rejected",
  "applied",
  "failed",
]);

const metadataSchema = z.record(z.string(), z.unknown());

// Kolom ringkas workflow TANPA sceneData (scene Excalidraw bisa ~MB). Dipakai
// untuk list/detail/ownership agar payload kecil; scene di-fetch terpisah.
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

const frameRefSchema = z.object({
  id: z.string().min(1).max(120),
  name: z.string().max(160).nullable(),
  mention: z.string().min(1).max(180),
  elementIds: z.array(z.string().min(1).max(120)).max(500).default([]),
  bounds: z
    .object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
    })
    .optional(),
});

const proposalChangeSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("add"),
    element: z.unknown(),
  }),
  z.object({
    type: z.literal("update"),
    elementId: z.string().min(1).max(120),
    patch: z.record(z.string(), z.unknown()),
  }),
  z.object({
    type: z.literal("delete"),
    elementId: z.string().min(1).max(120),
  }),
]);

const proposalInput = z.object({
  summary: z.string().min(1).max(2000),
  frameIds: z.array(z.string().min(1).max(120)).max(MAX_FRAME_REFS).default([]),
  changes: z.array(proposalChangeSchema).max(MAX_PROPOSAL_CHANGES).default([]),
});

async function requireWorkflow(workflowId: number, userId: string) {
  const [workflow] = await db
    .select(workflowSummaryColumns)
    .from(canvasAgentWorkflows)
    .where(
      and(
        eq(canvasAgentWorkflows.id, workflowId),
        eq(canvasAgentWorkflows.userId, userId),
      ),
    )
    .limit(1);

  if (!workflow) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Workflow not found" });
  }

  return workflow;
}

async function requireProposal(proposalId: number, userId: string) {
  const [row] = await db
    .select({ proposal: canvasAgentProposals })
    .from(canvasAgentProposals)
    .innerJoin(
      canvasAgentWorkflows,
      eq(canvasAgentWorkflows.id, canvasAgentProposals.workflowId),
    )
    .where(
      and(
        eq(canvasAgentProposals.id, proposalId),
        eq(canvasAgentWorkflows.userId, userId),
      ),
    )
    .limit(1);

  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Proposal not found" });
  }

  return row.proposal;
}

async function requireRun(runId: number, userId: string) {
  const [row] = await db
    .select({ run: canvasAgentRuns })
    .from(canvasAgentRuns)
    .innerJoin(
      canvasAgentWorkflows,
      eq(canvasAgentWorkflows.id, canvasAgentRuns.workflowId),
    )
    .where(
      and(
        eq(canvasAgentRuns.id, runId),
        eq(canvasAgentWorkflows.userId, userId),
      ),
    )
    .limit(1);

  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Run not found" });
  }

  return row.run;
}

export const canvasAgentRouter = router({
  getConfig: authenticatedProcedure.query(async () => {
    const [settings] = await db
      .select({
        enabled: aiToolSettings.canvasAgentEnabled,
        provider: aiToolSettings.canvasAgentProvider,
        model: aiToolSettings.canvasAgentModel,
        updatedAt: aiToolSettings.updatedAt,
      })
      .from(aiToolSettings)
      .where(eq(aiToolSettings.id, 1))
      .limit(1);

    return (
      settings ?? {
        enabled: false,
        provider: "gemini",
        model: "",
        updatedAt: null,
      }
    );
  }),

  listWorkflows: authenticatedProcedure.query(async ({ ctx }) => {
    // Ringkas tanpa sceneData — scene di-fetch via getWorkflowScene saat dibuka.
    return db
      .select(workflowSummaryColumns)
      .from(canvasAgentWorkflows)
      .where(eq(canvasAgentWorkflows.userId, ctx.session.user.id))
      .orderBy(
        desc(canvasAgentWorkflows.isPinned),
        desc(canvasAgentWorkflows.updatedAt),
      );
  }),

  // Endpoint khusus scene (satu-satunya yang membawa sceneData berukuran besar).
  getWorkflowScene: authenticatedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const [row] = await db
        .select({ sceneData: canvasAgentWorkflows.sceneData })
        .from(canvasAgentWorkflows)
        .where(
          and(
            eq(canvasAgentWorkflows.id, input.id),
            eq(canvasAgentWorkflows.userId, ctx.session.user.id),
          ),
        )
        .limit(1);
      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workflow not found" });
      }
      return { sceneData: row.sceneData ?? null };
    }),

  getWorkflow: authenticatedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const workflow = await requireWorkflow(input.id, ctx.session.user.id);
      const [messages, proposals, runs] = await Promise.all([
        db
          .select()
          .from(canvasAgentMessages)
          .where(eq(canvasAgentMessages.workflowId, workflow.id))
          .orderBy(canvasAgentMessages.createdAt),
        db
          .select()
          .from(canvasAgentProposals)
          .where(eq(canvasAgentProposals.workflowId, workflow.id))
          .orderBy(desc(canvasAgentProposals.createdAt)),
        db
          .select()
          .from(canvasAgentRuns)
          .where(eq(canvasAgentRuns.workflowId, workflow.id))
          .orderBy(desc(canvasAgentRuns.createdAt))
          .limit(20),
      ]);

      return { workflow, messages, proposals, runs };
    }),

  getWorkflowSummary: authenticatedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      return requireWorkflow(input.id, ctx.session.user.id);
    }),

  getWorkflowMessages: authenticatedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        cursor: z.number().int().positive().optional(),
        limit: z.number().int().min(1).max(100).optional().default(40),
      }),
    )
    .query(async ({ ctx, input }) => {
      const workflow = await requireWorkflow(input.id, ctx.session.user.id);
      const rows = await db
        .select()
        .from(canvasAgentMessages)
        .where(
          input.cursor
            ? and(
                eq(canvasAgentMessages.workflowId, workflow.id),
                lt(canvasAgentMessages.id, input.cursor),
              )
            : eq(canvasAgentMessages.workflowId, workflow.id),
        )
        .orderBy(desc(canvasAgentMessages.id))
        .limit(input.limit + 1);
      const hasMore = rows.length > input.limit;
      const items = rows.slice(0, input.limit).reverse();
      return {
        items,
        nextCursor: hasMore ? items[0]?.id ?? null : null,
      };
    }),

  getWorkflowRuns: authenticatedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const workflow = await requireWorkflow(input.id, ctx.session.user.id);
      return db
        .select()
        .from(canvasAgentRuns)
        .where(eq(canvasAgentRuns.workflowId, workflow.id))
        .orderBy(desc(canvasAgentRuns.createdAt))
        .limit(20);
    }),

  getWorkflowProposals: authenticatedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const workflow = await requireWorkflow(input.id, ctx.session.user.id);
      return db
        .select()
        .from(canvasAgentProposals)
        .where(eq(canvasAgentProposals.workflowId, workflow.id))
        .orderBy(desc(canvasAgentProposals.createdAt));
    }),

  createWorkflow: authenticatedProcedure
    .input(
      z
        .object({
          title: z.string().min(1).max(WORKFLOW_TITLE_MAX).optional(),
          activeFrameIds: z
            .array(z.string().min(1).max(120))
            .max(MAX_FRAME_REFS)
            .optional(),
          metadata: metadataSchema.optional(),
        })
        .optional(),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .insert(canvasAgentWorkflows)
        .values({
          userId: ctx.session.user.id,
          title: input?.title?.trim() || "Untitled workflow",
          activeFrameIds: input?.activeFrameIds ?? [],
          metadata: input?.metadata ?? {},
        })
        .returning(workflowSummaryColumns);
      return row;
    }),

  updateWorkflow: authenticatedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        title: z.string().min(1).max(WORKFLOW_TITLE_MAX).optional(),
        status: workflowStatus.optional(),
        isPinned: z.boolean().optional(),
        activeFrameIds: z
          .array(z.string().min(1).max(120))
          .max(MAX_FRAME_REFS)
          .optional(),
        metadata: metadataSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireWorkflow(input.id, ctx.session.user.id);
      const shouldTouchUpdatedAt =
        input.title !== undefined ||
        input.status !== undefined ||
        input.activeFrameIds !== undefined ||
        input.metadata !== undefined;
      const [row] = await db
        .update(canvasAgentWorkflows)
        .set({
          ...(input.title !== undefined ? { title: input.title.trim() } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.isPinned !== undefined ? { isPinned: input.isPinned } : {}),
          ...(input.activeFrameIds !== undefined
            ? { activeFrameIds: input.activeFrameIds }
            : {}),
          ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
          ...(shouldTouchUpdatedAt ? { updatedAt: new Date() } : {}),
        })
        .where(eq(canvasAgentWorkflows.id, input.id))
        .returning(workflowSummaryColumns);
      return row;
    }),

  // Simpan scene canvas (Excalidraw) ke workflow tertentu. sceneData opaque
  // ({ elements, appState, files }) seperti canvas_documents lama.
  saveWorkflowScene: authenticatedProcedure
    .input(z.object({ id: z.number().int().positive(), sceneData: z.unknown() }))
    .mutation(async ({ ctx, input }) => {
      await requireWorkflow(input.id, ctx.session.user.id);
      const [row] = await db
        .update(canvasAgentWorkflows)
        .set({
          sceneData: input.sceneData as Record<string, unknown>,
          updatedAt: new Date(),
        })
        .where(eq(canvasAgentWorkflows.id, input.id))
        // Jangan balikin sceneData (~MB) — frontend tak memakainya.
        .returning({
          id: canvasAgentWorkflows.id,
          updatedAt: canvasAgentWorkflows.updatedAt,
        });
      return row;
    }),

  deleteWorkflow: authenticatedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await requireWorkflow(input.id, ctx.session.user.id);
      await db
        .delete(canvasAgentWorkflows)
        .where(eq(canvasAgentWorkflows.id, input.id));
      return { ok: true };
    }),

  addMessage: authenticatedProcedure
    .input(
      z.object({
        workflowId: z.number().int().positive(),
        content: z.string().min(1).max(MESSAGE_CONTENT_MAX),
        frameRefs: z.array(frameRefSchema).max(MAX_FRAME_REFS).default([]),
        metadata: metadataSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireWorkflow(input.workflowId, ctx.session.user.id);
      const [row] = await db
        .insert(canvasAgentMessages)
        .values({
          workflowId: input.workflowId,
          role: "user",
          content: input.content.trim(),
          frameRefs: input.frameRefs,
          metadata: input.metadata ?? {},
        })
        .returning();

      await db
        .update(canvasAgentWorkflows)
        .set({ updatedAt: new Date() })
        .where(eq(canvasAgentWorkflows.id, input.workflowId));

      return row;
    }),

  retryRun: authenticatedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const run = await requireRun(input.id, ctx.session.user.id);
      if (run.status !== "failed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Hanya run failed yang bisa di-retry",
        });
      }
      const [row] = await db
        .update(canvasAgentRuns)
        .set({
          status: "pending",
          errorMessage: null,
          startedAt: null,
          completedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(canvasAgentRuns.id, run.id))
        .returning();
      enqueueCanvasAgentRun(row.id);
      return row;
    }),

  saveAssistantMessage: authenticatedProcedure
    .input(
      z.object({
        workflowId: z.number().int().positive(),
        role: messageRole.optional().default("assistant"),
        content: z.string().min(1).max(MESSAGE_CONTENT_MAX),
        frameRefs: z.array(frameRefSchema).max(MAX_FRAME_REFS).default([]),
        metadata: metadataSchema.optional(),
        proposal: proposalInput.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireWorkflow(input.workflowId, ctx.session.user.id);
      const [message] = await db
        .insert(canvasAgentMessages)
        .values({
          workflowId: input.workflowId,
          role: input.role,
          content: input.content.trim(),
          frameRefs: input.frameRefs,
          metadata: input.metadata ?? {},
        })
        .returning();

      let proposal: typeof canvasAgentProposals.$inferSelect | null = null;
      if (input.proposal) {
        const [createdProposal] = await db
          .insert(canvasAgentProposals)
          .values({
            workflowId: input.workflowId,
            createdFromMessageId: message.id,
            summary: input.proposal.summary,
            frameIds: input.proposal.frameIds,
            changes: input.proposal.changes,
          })
          .returning();
        proposal = createdProposal;
      }

      await db
        .update(canvasAgentWorkflows)
        .set({ updatedAt: new Date() })
        .where(eq(canvasAgentWorkflows.id, input.workflowId));

      return { message, proposal };
    }),

  updateProposalStatus: authenticatedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        status: proposalStatus,
        errorMessage: z.string().max(2000).nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireProposal(input.id, ctx.session.user.id);
      const [row] = await db
        .update(canvasAgentProposals)
        .set({
          status: input.status,
          errorMessage: input.errorMessage ?? null,
          ...(input.status === "applied" ? { appliedAt: new Date() } : {}),
          updatedAt: new Date(),
        })
        .where(eq(canvasAgentProposals.id, input.id))
        .returning();
      return row;
    }),
});
