import { streamSSE, type SSEStreamingApi } from "hono/streaming";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import { auth } from "../auth/index.js";
import { db } from "../db/index.js";
import {
  canvasAgentWorkflows,
  type CanvasAgentFrameRef,
} from "../db/schema/index.js";
import {
  createCanvasAgentUserMessageRun,
  runCanvasAgentRun,
} from "../lib/canvas-agent-runner.js";

const MESSAGE_CONTENT_MAX = 12_000;
const MAX_FRAME_REFS = 50;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 8;

const workflowSummaryColumns = {
  id: canvasAgentWorkflows.id,
  title: canvasAgentWorkflows.title,
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

const streamBodySchema = z.object({
  content: z.string().min(1).max(MESSAGE_CONTENT_MAX),
  frameRefs: z.array(frameRefSchema).max(MAX_FRAME_REFS).default([]),
  metadata: z.record(z.string(), z.unknown()).optional(),
  clientMessageId: z.string().min(1).max(120).optional(),
});

type CanvasAgentStreamEvent =
  | { type: "user_message"; message: unknown; clientMessageId?: string }
  | { type: "run_started"; run: unknown }
  | { type: "assistant_delta"; runId: number; delta: string }
  | { type: "assistant_message"; message: unknown; runId: number }
  | { type: "proposal_created"; proposal: unknown; runId: number }
  | { type: "run_completed"; run: unknown }
  | { type: "run_failed"; run: unknown; errorMessage: string }
  | { type: "agent_disabled"; message: string };

const rateLimitBuckets = new Map<string, number[]>();

function checkRateLimit(userId: string) {
  const now = Date.now();
  const bucket = (rateLimitBuckets.get(userId) ?? []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
  );
  if (bucket.length >= RATE_LIMIT_MAX) {
    rateLimitBuckets.set(userId, bucket);
    return false;
  }
  bucket.push(now);
  rateLimitBuckets.set(userId, bucket);
  return true;
}

async function writeEvent(
  stream: SSEStreamingApi,
  event: CanvasAgentStreamEvent,
) {
  if (stream.aborted || stream.closed) return;
  await stream.writeSSE({
    event: event.type,
    data: JSON.stringify(event),
  });
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

  return workflow ?? null;
}

export const canvasAgentStreamRoute = new Hono();

canvasAgentStreamRoute.post(
  "/workflows/:workflowId/messages/stream",
  async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      return c.json({ error: "Not signed in" }, 401);
    }

    if (!checkRateLimit(session.user.id)) {
      return c.json({ error: "Too many canvas agent requests" }, 429);
    }

    const workflowId = Number.parseInt(c.req.param("workflowId"), 10);
    if (!Number.isFinite(workflowId) || workflowId <= 0) {
      return c.json({ error: "Invalid workflow id" }, 400);
    }

    const workflow = await requireWorkflow(workflowId, session.user.id);
    if (!workflow) {
      return c.json({ error: "Workflow not found" }, 404);
    }

    const parsed = streamBodySchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json({ error: "Invalid request body" }, 400);
    }

    c.header("Cache-Control", "no-store");
    c.header("Connection", "keep-alive");
    c.header("X-Accel-Buffering", "no");

    return streamSSE(c, async (stream) => {
      const heartbeat = setInterval(() => {
        void stream.write(": heartbeat\n\n");
      }, 20_000);
      stream.onAbort(() => {
        clearInterval(heartbeat);
      });

      try {
        const { message, run } = await createCanvasAgentUserMessageRun({
          workflow,
          content: parsed.data.content,
          frameRefs: parsed.data.frameRefs as CanvasAgentFrameRef[],
          metadata: {
            ...parsed.data.metadata,
            clientMessageId: parsed.data.clientMessageId,
            source: parsed.data.metadata?.source ?? "canvas-agent-panel",
          },
          enqueue: false,
        });

        await writeEvent(stream, {
          type: "user_message",
          message,
          clientMessageId: parsed.data.clientMessageId,
        });

        if (!run) {
          await writeEvent(stream, {
            type: "agent_disabled",
            message: "Canvas Agent belum enabled di AI Settings.",
          });
          return;
        }

        await runCanvasAgentRun(run.id, {
          signal: c.req.raw.signal,
          onRunStarted: (row) => writeEvent(stream, { type: "run_started", run: row }),
          onAssistantDelta: (delta) =>
            writeEvent(stream, {
              type: "assistant_delta",
              runId: run.id,
              delta,
            }),
          onAssistantMessage: (row) =>
            writeEvent(stream, {
              type: "assistant_message",
              message: row,
              runId: run.id,
            }),
          onProposalCreated: (row) =>
            writeEvent(stream, {
              type: "proposal_created",
              proposal: row,
              runId: run.id,
            }),
          onRunCompleted: (row) =>
            writeEvent(stream, { type: "run_completed", run: row }),
          onRunFailed: (row, errorMessage) =>
            writeEvent(stream, {
              type: "run_failed",
              run: row,
              errorMessage,
            }),
        });
      } catch (error) {
        await writeEvent(stream, {
          type: "run_failed",
          run: null,
          errorMessage:
            error instanceof Error
              ? error.message
              : "Canvas Agent stream gagal",
        });
      } finally {
        clearInterval(heartbeat);
      }
    });
  },
);
