import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, lt } from "drizzle-orm";
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
import { listLocalChatModels } from "../../lib/tts-providers.js";
import {
  getCachedScene,
  invalidateScene,
  setCachedScene,
} from "../../lib/scene-cache.js";
import { authenticatedProcedure, router } from "../init.js";

const WORKFLOW_TITLE_MAX = 120;
const MESSAGE_CONTENT_MAX = 12_000;
const MAX_FRAME_REFS = 50;
const MAX_PROPOSAL_CHANGES = 200;
const MAX_RUN_RETRIES = 3;
const STALE_RUN_TIMEOUT_MS = 5 * 60_000;

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
  customData: z.record(z.string(), z.unknown()).optional(),
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

function getRetryCount(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return 0;
  }
  const retryCount = (snapshot as Record<string, unknown>).retryCount;
  return typeof retryCount === "number" && Number.isFinite(retryCount)
    ? retryCount
    : 0;
}

async function expireStaleWorkflowRuns(workflowId: number) {
  const cutoff = new Date(Date.now() - STALE_RUN_TIMEOUT_MS);
  await db
    .update(canvasAgentRuns)
    .set({
      status: "failed",
      errorMessage:
        "Agent run timeout setelah server restart atau koneksi terputus. Silakan retry.",
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(canvasAgentRuns.workflowId, workflowId),
        inArray(canvasAgentRuns.status, ["pending", "running"]),
        lt(canvasAgentRuns.updatedAt, cutoff),
      ),
    );
}

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
        ttsApiKeyEncrypted: aiToolSettings.ttsApiKeyEncrypted,
        openrouterApiKeyEncrypted: aiToolSettings.openrouterApiKeyEncrypted,
        vertexServiceAccountEncrypted: aiToolSettings.vertexServiceAccountEncrypted,
        localBaseUrl: aiToolSettings.localBaseUrl,
        updatedAt: aiToolSettings.updatedAt,
      })
      .from(aiToolSettings)
      .where(eq(aiToolSettings.id, 1))
      .limit(1);

    if (!settings) {
      return {
        enabled: false,
        provider: "gemini" as const,
        model: "",
        geminiActive: false,
        openrouterActive: false,
        vertexActive: false,
        localActive: false,
        updatedAt: null,
      };
    }

    return {
      enabled: settings.enabled,
      provider: settings.provider as "gemini" | "vertex" | "openrouter" | "local",
      model: settings.model,
      geminiActive: Boolean(settings.ttsApiKeyEncrypted),
      openrouterActive: Boolean(settings.openrouterApiKeyEncrypted),
      vertexActive: Boolean(settings.vertexServiceAccountEncrypted),
      localActive: Boolean(settings.localBaseUrl),
      updatedAt: settings.updatedAt,
    };
  }),

  // Deteksi live model dari endpoint lokal (dipanggil saat dropdown dibuka).
  listLocalModels: authenticatedProcedure.query(async () => {
    const [settings] = await db
      .select({ localBaseUrl: aiToolSettings.localBaseUrl })
      .from(aiToolSettings)
      .where(eq(aiToolSettings.id, 1))
      .limit(1);

    const baseUrl = settings?.localBaseUrl?.trim();
    if (!baseUrl) {
      return { models: [] as { id: string; name: string }[], configured: false };
    }

    try {
      const models = await listLocalChatModels(baseUrl);
      return { models, configured: true };
    } catch (err) {
      return {
        models: [] as { id: string; name: string }[],
        configured: true,
        error: err instanceof Error ? err.message : "Gagal mendeteksi model lokal",
      };
    }
  }),

  updateConfig: authenticatedProcedure
    .input(
      z.object({
        provider: z.enum(["gemini", "vertex", "openrouter", "local"]),
        model: z.string().min(1).max(160),
      })
    )
    .mutation(async ({ input }) => {
      const [row] = await db
        .update(aiToolSettings)
        .set({
          canvasAgentProvider: input.provider,
          canvasAgentModel: input.model,
          updatedAt: new Date(),
        })
        .where(eq(aiToolSettings.id, 1))
        .returning();

      return {
        enabled: row.canvasAgentEnabled,
        provider: row.canvasAgentProvider as
          | "gemini"
          | "vertex"
          | "openrouter"
          | "local",
        model: row.canvasAgentModel,
        geminiActive: Boolean(row.ttsApiKeyEncrypted),
        openrouterActive: Boolean(row.openrouterApiKeyEncrypted),
        vertexActive: Boolean(row.vertexServiceAccountEncrypted),
        localActive: Boolean(row.localBaseUrl),
        updatedAt: row.updatedAt,
      };
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
      // 1) Cache-first: cek Redis dulu sebelum query DB.
      const cached = await getCachedScene(input.id);
      if (cached !== null) {
        // Validasi ownership ringan (tanpa baca jsonb) — cache key tidak
        // menyimpan userId, jadi tetap perlu pengecekan.
        const [owned] = await db
          .select({ id: canvasAgentWorkflows.id })
          .from(canvasAgentWorkflows)
          .where(
            and(
              eq(canvasAgentWorkflows.id, input.id),
              eq(canvasAgentWorkflows.userId, ctx.session.user.id),
            ),
          )
          .limit(1);
        if (!owned) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Workflow not found" });
        }
        return { sceneData: cached };
      }

      // 2) Cache miss: gabung ownership + sceneData dalam 1 query
      //    (sebelumnya 2 query terpisah — hemat 1 round-trip DB).
      const [row] = await db
        .select({
          id: canvasAgentWorkflows.id,
          sceneData: canvasAgentWorkflows.sceneData,
        })
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
      const sceneData = row.sceneData ?? null;
      if (sceneData !== null) {
        await setCachedScene(input.id, sceneData);
      }
      return { sceneData };
    }),

  getWorkflow: authenticatedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const workflow = await requireWorkflow(input.id, ctx.session.user.id);
      await expireStaleWorkflowRuns(workflow.id);
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

  getAgentThreadSnapshot: authenticatedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const workflow = await requireWorkflow(input.id, ctx.session.user.id);
      await expireStaleWorkflowRuns(workflow.id);
      const [messages, runs, proposals] = await Promise.all([
        db
          .select()
          .from(canvasAgentMessages)
          .where(eq(canvasAgentMessages.workflowId, workflow.id))
          .orderBy(desc(canvasAgentMessages.id))
          .limit(41),
        db
          .select()
          .from(canvasAgentRuns)
          .where(eq(canvasAgentRuns.workflowId, workflow.id))
          .orderBy(desc(canvasAgentRuns.createdAt))
          .limit(20),
        db
          .select()
          .from(canvasAgentProposals)
          .where(eq(canvasAgentProposals.workflowId, workflow.id))
          .orderBy(desc(canvasAgentProposals.createdAt)),
      ]);
      const hasMoreMessages = messages.length > 40;
      const messageItems = messages.slice(0, 40).reverse();
      return {
        workflow,
        messages: {
          items: messageItems,
          nextCursor: hasMoreMessages ? messageItems[0]?.id ?? null : null,
        },
        runs,
        proposals,
      };
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
      await expireStaleWorkflowRuns(workflow.id);
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
      // Write-through agar load berikutnya warm.
      await setCachedScene(
        input.id,
        input.sceneData as Record<string, unknown>,
      );
      return row;
    }),

  deleteWorkflow: authenticatedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await requireWorkflow(input.id, ctx.session.user.id);
      await db
        .delete(canvasAgentWorkflows)
        .where(eq(canvasAgentWorkflows.id, input.id));
      await invalidateScene(input.id);
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
      let run = await requireRun(input.id, ctx.session.user.id);
      await expireStaleWorkflowRuns(run.workflowId);
      run = await requireRun(input.id, ctx.session.user.id);
      if (run.status !== "failed") {
        if (run.status === "pending" || run.status === "running") {
          return run;
        }
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Hanya run failed yang bisa di-retry",
        });
      }
      const retryCount = getRetryCount(run.inputSnapshot);
      if (retryCount >= MAX_RUN_RETRIES) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Retry maksimal ${MAX_RUN_RETRIES}x per run`,
        });
      }
      const [row] = await db
        .update(canvasAgentRuns)
        .set({
          status: "pending",
          errorMessage: null,
          startedAt: null,
          completedAt: null,
          inputSnapshot: {
            ...run.inputSnapshot,
            retryCount: retryCount + 1,
          },
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(canvasAgentRuns.id, run.id),
            eq(canvasAgentRuns.status, "failed"),
          ),
        )
        .returning();
      if (!row) {
        const current = await requireRun(input.id, ctx.session.user.id);
        if (current.status === "pending" || current.status === "running") {
          return current;
        }
        throw new TRPCError({
          code: "CONFLICT",
          message: "Run sedang diproses ulang",
        });
      }
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
