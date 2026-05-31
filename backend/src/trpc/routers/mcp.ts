import { count, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../../db/index.js";
import { aiToolSettings, mcpActionRequests } from "../../db/schema/index.js";
import {
  approveMcpActionRequest,
  rejectMcpActionRequest,
} from "../../lib/mcp-action-executor.js";
import {
  generateMcpTokenValue,
  hashMcpToken,
} from "../../lib/mcp-token.js";
import { getPortoMcpCatalog } from "../../mcp/server.js";
import { protectedProcedure, router } from "../init.js";

const statusInput = z.enum([
  "pending",
  "approved",
  "rejected",
  "running",
  "succeeded",
  "failed",
]);

export const mcpRouter = router({
  overview: protectedProcedure.query(async () => {
    const [pending, failed, succeeded] = await Promise.all([
      db
        .select({ value: count() })
        .from(mcpActionRequests)
        .where(eq(mcpActionRequests.status, "pending")),
      db
        .select({ value: count() })
        .from(mcpActionRequests)
        .where(eq(mcpActionRequests.status, "failed")),
      db
        .select({ value: count() })
        .from(mcpActionRequests)
        .where(eq(mcpActionRequests.status, "succeeded")),
    ]);

    return {
      catalog: getPortoMcpCatalog(),
      counts: {
        pending: pending[0]?.value ?? 0,
        failed: failed[0]?.value ?? 0,
        succeeded: succeeded[0]?.value ?? 0,
      },
    };
  }),

  listRequests: protectedProcedure
    .input(
      z
        .object({
          status: statusInput.optional(),
          limit: z.number().int().min(1).max(100).optional().default(50),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      return db
        .select()
        .from(mcpActionRequests)
        .where(
          input?.status ? eq(mcpActionRequests.status, input.status) : undefined,
        )
        .orderBy(desc(mcpActionRequests.createdAt))
        .limit(input?.limit ?? 50);
    }),

  approve: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      return approveMcpActionRequest({
        id: input.id,
        approvedBy: ctx.session.user.id,
      });
    }),

  reject: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        reason: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return rejectMcpActionRequest({
        id: input.id,
        approvedBy: ctx.session.user.id,
        reason: input.reason,
      });
    }),

  // Info token MCP untuk dashboard — TIDAK mengembalikan token/hash.
  getMcpTokenInfo: protectedProcedure.query(async () => {
    const [settings] = await db
      .select({
        last4: aiToolSettings.mcpTokenLast4,
        createdAt: aiToolSettings.mcpTokenCreatedAt,
        hash: aiToolSettings.mcpTokenHash,
      })
      .from(aiToolSettings)
      .where(eq(aiToolSettings.id, 1))
      .limit(1);
    return {
      configured: Boolean(settings?.hash),
      last4: settings?.last4 ?? null,
      createdAt: settings?.createdAt ?? null,
    };
  }),

  // Generate (atau rotasi) token MCP. Token mentah dikembalikan SEKALI saja.
  generateMcpToken: protectedProcedure.mutation(async () => {
    const token = generateMcpTokenValue();
    const hash = hashMcpToken(token);
    const last4 = token.slice(-4);
    const createdAt = new Date();
    await db
      .insert(aiToolSettings)
      .values({
        id: 1,
        mcpTokenHash: hash,
        mcpTokenLast4: last4,
        mcpTokenCreatedAt: createdAt,
        updatedAt: createdAt,
      })
      .onConflictDoUpdate({
        target: aiToolSettings.id,
        set: {
          mcpTokenHash: hash,
          mcpTokenLast4: last4,
          mcpTokenCreatedAt: createdAt,
          updatedAt: createdAt,
        },
      });
    return { token, last4, createdAt };
  }),
});
