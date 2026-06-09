import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db/index.js";
import {
  BLOG_CATEGORIES,
  blogPosts,
  canvasAgentProposals,
  mcpActionRequests,
  normalizeBlogCategory,
} from "../db/schema/index.js";

const blogDraftPayload = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().nullish(),
  content: z.string().nullish(),
  meta: z.string().nullish(),
  category: z.preprocess(
    normalizeBlogCategory,
    z.enum(BLOG_CATEGORIES).optional().default("global"),
  ),
  coverUrl: z.string().nullish(),
  published: z.boolean().optional().default(false),
  publishedAt: z.coerce.date().nullish(),
});

const blogUpdatePayload = z.object({
  id: z.number().int().positive(),
  data: blogDraftPayload.partial(),
});

const blogPublishPayload = z.object({
  id: z.number().int().positive(),
  published: z.boolean(),
  publishedAt: z.coerce.date().nullish(),
});

const canvasProposalPayload = z.object({
  workflowId: z.number().int().positive(),
  summary: z.string().min(1),
  frameIds: z.array(z.string()).default([]),
  changes: z.array(z.unknown()).default([]),
});

const canvasMetadataPayload = z.object({
  workflowId: z.number().int().positive(),
  frameId: z.string().min(1),
  customData: z.record(z.string(), z.unknown()),
  summary: z.string().optional(),
});

export async function approveMcpActionRequest(args: {
  id: number;
  approvedBy: string;
}) {
  const [row] = await db
    .select()
    .from(mcpActionRequests)
    .where(eq(mcpActionRequests.id, args.id))
    .limit(1);

  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "MCP action not found" });
  }
  if (row.status !== "pending") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only pending MCP actions can be approved",
    });
  }

  const now = new Date();
  try {
    if (row.domain === "blog" && row.action === "blog_propose_create") {
      const payload = blogDraftPayload.parse(row.payload);
      const [post] = await db
        .insert(blogPosts)
        .values({ ...payload, published: false, publishedAt: null })
        .returning();
      return completeAction(row.id, args.approvedBy, {
        blogPostId: post.id,
        slug: post.slug,
      });
    }

    if (row.domain === "blog" && row.action === "blog_propose_update") {
      const payload = blogUpdatePayload.parse(row.payload);
      const [post] = await db
        .update(blogPosts)
        .set({ ...payload.data, updatedAt: now })
        .where(eq(blogPosts.id, payload.id))
        .returning();
      if (!post) throw new Error("Blog post not found");
      return completeAction(row.id, args.approvedBy, {
        blogPostId: post.id,
        slug: post.slug,
      });
    }

    if (row.domain === "blog" && row.action === "blog_propose_publish") {
      const payload = blogPublishPayload.parse(row.payload);
      const [post] = await db
        .update(blogPosts)
        .set({
          published: payload.published,
          publishedAt: payload.published
            ? (payload.publishedAt ?? now)
            : null,
          updatedAt: now,
        })
        .where(eq(blogPosts.id, payload.id))
        .returning();
      if (!post) throw new Error("Blog post not found");
      return completeAction(row.id, args.approvedBy, {
        blogPostId: post.id,
        published: post.published,
      });
    }

    if (row.domain === "canvas" && row.action === "canvas_create_proposal") {
      const payload = canvasProposalPayload.parse(row.payload);
      const [proposal] = await db
        .insert(canvasAgentProposals)
        .values({
          workflowId: payload.workflowId,
          summary: payload.summary,
          frameIds: payload.frameIds,
          changes: payload.changes as never,
        })
        .returning();
      return completeAction(row.id, args.approvedBy, {
        canvasProposalId: proposal.id,
      });
    }

    if (
      row.domain === "canvas" &&
      row.action === "canvas_enrich_frame_metadata"
    ) {
      const payload = canvasMetadataPayload.parse(row.payload);
      const [proposal] = await db
        .insert(canvasAgentProposals)
        .values({
          workflowId: payload.workflowId,
          summary:
            payload.summary ??
            `Update metadata frame ${payload.frameId}`,
          frameIds: [payload.frameId],
          changes: [
            {
              type: "update",
              elementId: payload.frameId,
              patch: { customData: payload.customData },
            },
          ],
        })
        .returning();
      return completeAction(row.id, args.approvedBy, {
        canvasProposalId: proposal.id,
      });
    }

    if (
      row.domain === "tools.image" &&
      row.action === "image_propose_generation"
    ) {
      const [updated] = await db
        .update(mcpActionRequests)
        .set({
          status: "approved",
          approvedBy: args.approvedBy,
          approvedAt: now,
          updatedAt: now,
          result: {
            nextTool: "image_generate_after_approval",
            note: "Approved; execute the existing image generation service in the next implementation slice.",
          },
        })
        .where(eq(mcpActionRequests.id, row.id))
        .returning();
      return updated;
    }

    throw new Error(
      `Unsupported MCP action executor: ${row.domain}.${row.action}`,
    );
  } catch (error) {
    const message = formatApprovalError(error, {
      action: row.action,
      domain: row.domain,
      payload: row.payload,
    });
    await db
      .update(mcpActionRequests)
      .set({
        status: "failed",
        approvedBy: args.approvedBy,
        approvedAt: now,
        completedAt: now,
        updatedAt: now,
        errorMessage: message,
      })
      .where(eq(mcpActionRequests.id, row.id))
      .returning();
    throw new TRPCError({ code: "BAD_REQUEST", message });
  }
}

export async function rejectMcpActionRequest(args: {
  id: number;
  approvedBy: string;
  reason?: string | null;
}) {
  const [row] = await db
    .select()
    .from(mcpActionRequests)
    .where(eq(mcpActionRequests.id, args.id))
    .limit(1);
  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "MCP action not found" });
  }
  if (row.status !== "pending") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only pending MCP actions can be rejected",
    });
  }

  const now = new Date();
  const [updated] = await db
    .update(mcpActionRequests)
    .set({
      status: "rejected",
      approvedBy: args.approvedBy,
      approvedAt: now,
      completedAt: now,
      updatedAt: now,
      result: args.reason ? { reason: args.reason } : {},
    })
    .where(eq(mcpActionRequests.id, args.id))
    .returning();
  return updated;
}

async function completeAction(
  id: number,
  approvedBy: string,
  result: Record<string, unknown>,
) {
  const now = new Date();
  const [updated] = await db
    .update(mcpActionRequests)
    .set({
      status: "succeeded",
      approvedBy,
      approvedAt: now,
      completedAt: now,
      updatedAt: now,
      result,
    })
    .where(eq(mcpActionRequests.id, id))
    .returning();
  return updated;
}

function formatApprovalError(
  error: unknown,
  context: {
    action: string;
    domain: string;
    payload: unknown;
  },
) {
  if (error instanceof z.ZodError) {
    const issues = error.issues.slice(0, 3).map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "payload";
      return `${path}: ${issue.message}`;
    });
    return `Payload MCP tidak valid untuk ${context.action}: ${issues.join(
      "; ",
    )}`;
  }

  if (isUniqueViolation(error)) {
    const slug = getPayloadSlug(context.payload);
    if (slug) {
      return `Slug blog "${slug}" sudah dipakai. Ubah slug draft MCP lalu ajukan ulang.`;
    }
    return "Data blog memakai nilai unik yang sudah ada. Periksa slug draft MCP lalu ajukan ulang.";
  }

  if (isBlogTargetNotFound(error)) {
    return `Blog post target tidak ditemukan untuk ${context.action}. Periksa ID blog pada payload MCP.`;
  }

  if (isUnsupportedExecutor(error)) {
    return `Unsupported MCP action executor: ${context.domain}.${context.action}`;
  }

  return error instanceof Error ? error.message : "Failed to approve MCP action";
}

function isUniqueViolation(error: unknown) {
  const record = toRecord(error);
  if (!record) return false;

  const code = String(record.code ?? "");
  const constraint = String(record.constraint_name ?? record.constraint ?? "");
  const detail = String(record.detail ?? "");
  const message = String(record.message ?? "");

  return (
    code === "23505" ||
    constraint.includes("blog_posts_slug_unique") ||
    detail.includes("already exists") ||
    message.includes("duplicate key value")
  );
}

function isBlogTargetNotFound(error: unknown) {
  return error instanceof Error && error.message === "Blog post not found";
}

function isUnsupportedExecutor(error: unknown) {
  return (
    error instanceof Error &&
    error.message.startsWith("Unsupported MCP action executor:")
  );
}

function getPayloadSlug(payload: unknown) {
  const record = toRecord(payload);
  if (!record) return null;
  if (typeof record.slug === "string" && record.slug.trim()) {
    return record.slug.trim();
  }

  const data = toRecord(record.data);
  if (typeof data?.slug === "string" && data.slug.trim()) {
    return data.slug.trim();
  }

  return null;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}
