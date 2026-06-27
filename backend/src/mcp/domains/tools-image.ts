import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../../db/index.js";
import { mcpActionRequests, toolGeneration } from "../../db/schema/index.js";
import { publicUrl } from "../../lib/public-url.js";
import { generateImageForUser } from "../../trpc/routers/tools.js";
import type { PortoMcpRegistry } from "../registry.js";

export function registerToolsImageMcp(registry: PortoMcpRegistry) {
  registry.resources.push(
    {
      name: "tools_images_history",
      title: "Tools Image History",
      uriTemplate: "porto://tools/images/history",
      description: "History generate image dari tabel tool_generation.",
      read: async (context) => {
        const rows = await db
          .select()
          .from(toolGeneration)
          .where(
            context.userId
              ? and(
                  eq(toolGeneration.kind, "image"),
                  eq(toolGeneration.userId, context.userId),
                )
              : eq(toolGeneration.kind, "image"),
          )
          .orderBy(desc(toolGeneration.createdAt))
          .limit(30);
        return {
          images: rows.map((row) => ({
            ...row,
            fileUrl: publicUrl(row.fileUrl),
          })),
        };
      },
    },
    {
      name: "tools_image_detail",
      title: "Tools Image Detail",
      uriTemplate: "porto://tools/images/{id}",
      description: "Detail satu hasil generate image.",
      read: async (context, variables) => {
        const id = Number(variables.id);
        const [row] = await db
          .select()
          .from(toolGeneration)
          .where(
            context.userId
              ? and(
                  eq(toolGeneration.id, id),
                  eq(toolGeneration.kind, "image"),
                  eq(toolGeneration.userId, context.userId),
                )
              : and(eq(toolGeneration.id, id), eq(toolGeneration.kind, "image")),
          )
          .limit(1);
        return {
          image: row ? { ...row, fileUrl: publicUrl(row.fileUrl) } : null,
        };
      },
    },
  );

  registry.tools.push(
    {
      name: "image_propose_generation",
      title: "Propose Image Generation",
      description:
        "Membuat approval request untuk generate image; tidak memanggil N8N sebelum approval.",
      inputSchema: {
        prompt: z.string().min(1).max(2000),
        aspectRatio: z.enum(["1:1", "4:5", "3:4", "16:9", "9:16"]),
        references: z
          .array(
            z.object({
              url: z.string().min(1),
              mimeType: z.string().min(1),
            }),
          )
          .max(6)
          .optional(),
      },
      annotations: { openWorldHint: false },
      execute: async (context, input) => {
        const parsed = z
          .object({
            prompt: z.string().min(1).max(2000),
            aspectRatio: z.enum(["1:1", "4:5", "3:4", "16:9", "9:16"]),
            references: z
              .array(
                z.object({
                  url: z.string().min(1),
                  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
                }),
              )
              .max(6)
              .optional(),
          })
          .parse(input);
        const [row] = await db
          .insert(mcpActionRequests)
          .values({
            domain: "tools.image",
            action: "image_propose_generation",
            requestedBy: context.requestedBy,
            payload: parsed,
          })
          .returning();
        return row;
      },
    },
    {
      name: "image_generate_after_approval",
      title: "Generate Image After Approval",
      description:
        "Placeholder eksekusi setelah approval. Service extraction tools.generateImage harus dipakai untuk mengaktifkan N8N.",
      inputSchema: {
        actionRequestId: z.number().int().positive(),
      },
      annotations: { openWorldHint: false },
      execute: async (context, input) => {
        const { actionRequestId } = z
          .object({ actionRequestId: z.number().int().positive() })
          .parse(input);
        const [request] = await db
          .select()
          .from(mcpActionRequests)
          .where(eq(mcpActionRequests.id, actionRequestId))
          .limit(1);
        if (!request) throw new Error("MCP action request not found");
        if (
          request.domain !== "tools.image" ||
          request.action !== "image_propose_generation"
        ) {
          throw new Error("MCP action request is not an image generation");
        }
        if (request.status !== "approved") {
          throw new Error("Image generation request must be approved first");
        }
        if (!request.requestedBy && !context.userId) {
          throw new Error("Cannot resolve user for image generation");
        }

        const payload = imageGenerationPayload.parse(request.payload);
        await db
          .update(mcpActionRequests)
          .set({ status: "running", updatedAt: new Date() })
          .where(eq(mcpActionRequests.id, request.id));

        try {
          const references = await Promise.all(
            (payload.references ?? []).map(referenceToFramePayload),
          );
          const result = await generateImageForUser({
            userId: request.requestedBy ?? context.userId!,
            userEmail: context.userEmail,
            input: {
              prompt: payload.prompt,
              aspectRatio: payload.aspectRatio,
              references,
              provider: "n8n",
            },
          });
          const [updated] = await db
            .update(mcpActionRequests)
            .set({
              status: "succeeded",
              result: {
                toolGenerationId: result.id,
                url: result.url,
                requestId: result.requestId,
              },
              completedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(mcpActionRequests.id, request.id))
            .returning();
          return updated;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Image generation failed";
          const [updated] = await db
            .update(mcpActionRequests)
            .set({
              status: "failed",
              errorMessage: message,
              completedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(mcpActionRequests.id, request.id))
            .returning();
          return updated;
        }
      },
    },
  );
}

const imageGenerationPayload = z.object({
  prompt: z.string().min(1).max(2000),
  aspectRatio: z.enum(["1:1", "4:5", "3:4", "16:9", "9:16"]),
  references: z
    .array(
      z.object({
        url: z.string().min(1),
        mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
      }),
    )
    .max(6)
    .optional(),
});

async function referenceToFramePayload(reference: {
  url: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
}) {
  const response = await fetch(reference.url);
  if (!response.ok) {
    throw new Error(`Failed to fetch reference image: ${response.status}`);
  }
  const contentType = response.headers.get("content-type")?.split(";")[0];
  const mimeType = contentType === reference.mimeType ? contentType : reference.mimeType;
  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    base64: buffer.toString("base64"),
    mimeType,
  };
}
