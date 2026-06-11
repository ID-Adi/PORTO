import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../../db/index.js";
import { blogPosts, mcpActionRequests } from "../../db/schema/index.js";
import { buildCryptoDailyDraft, buildCryptoDraft, buildStockDailyDraft, buildStockDraft } from "../../lib/market-blog/draft.js";
import {
  CryptoDailyInputSchema,
  CryptoDraftInputSchema,
  StockDailyInputSchema,
  StockDraftInputSchema,
  approvalStatusShape,
  cryptoDailyShape,
  cryptoDraftShape,
  stockDailyShape,
  stockDraftShape,
  submitForApprovalShape,
  type MarketApprovalStatus,
  type MarketBlogDraft,
} from "../../lib/market-blog/types.js";
import type { PortoMcpContext, PortoMcpRegistry } from "../registry.js";

// Di model queue, approval direview di dashboard MCP admin (bukan /admin/blog/{id},
// karena blog post baru dibuat setelah approve).
const APPROVAL_URL = "/admin/mcp";

/**
 * Membuat approval request blog dari draft pasar. Memakai action
 * `blog_propose_create` agar executor approval yang sudah ada (mcp-action-executor)
 * langsung memprosesnya tanpa perubahan — guard "tidak auto publish" terjamin
 * karena payload.published = false dan post baru dibuat saat admin approve.
 */
async function enqueueMarketDraft(
  context: PortoMcpContext,
  draft: MarketBlogDraft,
) {
  const [row] = await db
    .insert(mcpActionRequests)
    .values({
      domain: "blog",
      action: "blog_propose_create",
      requestedBy: context.requestedBy,
      payload: {
        title: draft.title,
        slug: draft.slug,
        description: draft.description,
        content: draft.content,
        meta: draft.meta,
        category: draft.category,
        coverUrl: draft.coverUrl,
        published: false,
        publishedAt: null,
        // Disimpan untuk konteks dashboard; di-strip executor saat approve.
        sourceMetadata: draft.sourceMetadata,
      },
    })
    .returning();
  return row;
}

/**
 * Map status internal mcp_action_requests → state machine yang diekspos ke client.
 * `succeeded` berarti draft sudah dibuat (approved); bila blog post-nya kemudian
 * dipublish, status naik ke `published`.
 */
async function resolveApprovalStatus(row: {
  status: string;
  result: Record<string, unknown>;
  errorMessage: string | null;
}): Promise<{ status: MarketApprovalStatus; reviewNote?: string }> {
  switch (row.status) {
    case "pending":
    case "approved":
    case "running":
      return { status: "pending_approval" };
    case "rejected": {
      const reason = row.result?.reason;
      return {
        status: "rejected",
        reviewNote: typeof reason === "string" ? reason : undefined,
      };
    }
    case "failed":
      return {
        status: "rejected",
        reviewNote: row.errorMessage ?? undefined,
      };
    case "succeeded": {
      const blogPostId = row.result?.blogPostId;
      if (typeof blogPostId === "number") {
        const [post] = await db
          .select({ published: blogPosts.published })
          .from(blogPosts)
          .where(eq(blogPosts.id, blogPostId))
          .limit(1);
        if (post?.published) return { status: "published" };
      }
      return { status: "approved" };
    }
    default:
      return { status: "pending_approval" };
  }
}

function parseDraftId(draftId: string): number {
  const id = Number(draftId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`draftId tidak valid: ${draftId}`);
  }
  return id;
}

async function loadRequest(id: number) {
  const [row] = await db
    .select()
    .from(mcpActionRequests)
    .where(eq(mcpActionRequests.id, id))
    .limit(1);
  if (!row) throw new Error(`Draft tidak ditemukan: ${id}`);
  return row;
}

export function registerMarketBlogMcp(registry: PortoMcpRegistry) {
  registry.tools.push(
    {
      name: "market_blog_create_stock_draft",
      title: "Create Stock Market Blog Draft",
      description:
        "Membuat draft blog saham (kategori `saham_crypto`) dan mengirimkannya ke approval queue (status pending_approval). Tidak publish otomatis.",
      inputSchema: stockDraftShape,
      annotations: { openWorldHint: false },
      execute: async (context, input) => {
        const safe = StockDraftInputSchema.parse(input);
        const draft = buildStockDraft(safe);
        const row = await enqueueMarketDraft(context, draft);
        return {
          ok: true as const,
          type: "stock" as const,
          draftId: String(row.id),
          status: "pending_approval" as const,
          title: draft.title,
          slug: draft.slug,
          summary: draft.summary,
          approvalUrl: APPROVAL_URL,
          sources: draft.sourceMetadata.sources,
        };
      },
    },
    {
      name: "blog_propose_stock_daily",
      title: "Propose Daily Stock Market Blog (AI content)",
      description:
        "Membuat draft blog saham harian (kategori `saham_crypto`) dari konten markdown PENUH yang disusun AI agent (boleh tabel GFM). Masuk approval queue (pending_approval). Tidak publish otomatis. Disclaimer & blok Sumber dijamin hadir.",
      inputSchema: stockDailyShape,
      annotations: { openWorldHint: false },
      execute: async (context, input) => {
        const safe = StockDailyInputSchema.parse(input);
        const draft = buildStockDailyDraft(safe);
        const row = await enqueueMarketDraft(context, draft);
        return {
          ok: true as const,
          type: "stock" as const,
          draftId: String(row.id),
          requestId: row.id,
          category: "saham_crypto" as const,
          status: "pending_approval" as const,
          title: draft.title,
          slug: draft.slug,
          summary: draft.summary,
          approvalUrl: APPROVAL_URL,
          sources: draft.sourceMetadata.sources,
        };
      },
    },
    {
      name: "market_blog_create_crypto_draft",
      title: "Create Crypto Market Blog Draft",
      description:
        "Membuat draft blog crypto (kategori `saham_crypto`) dan mengirimkannya ke approval queue (status pending_approval). Tidak publish otomatis.",
      inputSchema: cryptoDraftShape,
      annotations: { openWorldHint: false },
      execute: async (context, input) => {
        const safe = CryptoDraftInputSchema.parse(input);
        const draft = buildCryptoDraft(safe);
        const row = await enqueueMarketDraft(context, draft);
        return {
          ok: true as const,
          type: "crypto" as const,
          draftId: String(row.id),
          status: "pending_approval" as const,
          title: draft.title,
          slug: draft.slug,
          summary: draft.summary,
          approvalUrl: APPROVAL_URL,
          sources: draft.sourceMetadata.sources,
        };
      },
    },
    {
      name: "blog_propose_crypto_daily",
      title: "Propose Daily Crypto Market Blog (AI content)",
      description:
        "Membuat draft blog crypto harian (kategori `saham_crypto`) dari konten markdown PENUH yang disusun AI agent (boleh tabel GFM). Masuk approval queue (pending_approval). Tidak publish otomatis. Disclaimer & blok Sumber dijamin hadir.",
      inputSchema: cryptoDailyShape,
      annotations: { openWorldHint: false },
      execute: async (context, input) => {
        const safe = CryptoDailyInputSchema.parse(input);
        const draft = buildCryptoDailyDraft(safe);
        const row = await enqueueMarketDraft(context, draft);
        return {
          ok: true as const,
          type: "crypto" as const,
          draftId: String(row.id),
          requestId: row.id,
          category: "saham_crypto" as const,
          status: "pending_approval" as const,
          title: draft.title,
          slug: draft.slug,
          summary: draft.summary,
          approvalUrl: APPROVAL_URL,
          sources: draft.sourceMetadata.sources,
        };
      },
    },
    {
      name: "market_blog_submit_for_approval",
      title: "Submit Market Draft for Approval",
      description:
        "Memastikan sebuah draft pasar berada di approval queue. Di model queue, draft sudah masuk saat dibuat — tool ini mengonfirmasi & mengembalikan status terkini.",
      inputSchema: submitForApprovalShape,
      annotations: { idempotentHint: true, openWorldHint: false },
      execute: async (_context, input) => {
        const parsed = z.object(submitForApprovalShape).parse(input);
        const id = parseDraftId(parsed.draftId);
        const row = await loadRequest(id);
        // Catat note ke payload bila masih pending (tidak mengubah alur approval).
        if (parsed.note && row.status === "pending") {
          await db
            .update(mcpActionRequests)
            .set({
              payload: { ...row.payload, submitNote: parsed.note },
              updatedAt: new Date(),
            })
            .where(eq(mcpActionRequests.id, id));
        }
        const freshRow = await loadRequest(id);
        const resolved = await resolveApprovalStatus(freshRow);
        return {
          ok: true as const,
          draftId: String(id),
          status: resolved.status,
          approvalUrl: APPROVAL_URL,
        };
      },
    },
    {
      name: "market_blog_get_approval_status",
      title: "Get Market Draft Approval Status",
      description:
        "Mengembalikan status approval sebuah draft pasar: pending_approval | approved | rejected | published.",
      inputSchema: approvalStatusShape,
      annotations: { readOnlyHint: true, idempotentHint: true },
      execute: async (_context, input) => {
        const parsed = z.object(approvalStatusShape).parse(input);
        const id = parseDraftId(parsed.draftId);
        const row = await loadRequest(id);
        const resolved = await resolveApprovalStatus(row);
        return {
          ok: true as const,
          draftId: String(id),
          status: resolved.status,
          ...(resolved.reviewNote ? { reviewNote: resolved.reviewNote } : {}),
        };
      },
    },
  );
}
