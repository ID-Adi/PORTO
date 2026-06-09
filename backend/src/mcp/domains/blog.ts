import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../../db/index.js";
import {
  BLOG_CATEGORIES,
  blogPosts,
  mcpActionRequests,
  normalizeBlogCategory,
} from "../../db/schema/index.js";
import type { PortoMcpRegistry } from "../registry.js";

export function registerBlogMcp(registry: PortoMcpRegistry) {
  registry.resources.push(
    {
      name: "admin_blog_posts",
      title: "Admin Blog Posts",
      uriTemplate: "porto://admin/blog/posts",
      description: "Daftar ringkas blog post PORTO.",
      read: async () => {
        const rows = await db
          .select({
            id: blogPosts.id,
            title: blogPosts.title,
            slug: blogPosts.slug,
            category: blogPosts.category,
            published: blogPosts.published,
            publishedAt: blogPosts.publishedAt,
            updatedAt: blogPosts.updatedAt,
          })
          .from(blogPosts)
          .orderBy(desc(blogPosts.createdAt))
          .limit(50);
        return { posts: rows };
      },
    },
    {
      name: "public_saham_crypto_posts",
      title: "Public Saham & Crypto Posts",
      uriTemplate: "porto://public/blog/saham-crypto",
      description:
        "50 laporan harian Saham & Crypto yang sudah published (kategori saham_crypto).",
      read: async () => {
        const rows = await db
          .select({
            id: blogPosts.id,
            title: blogPosts.title,
            slug: blogPosts.slug,
            description: blogPosts.description,
            meta: blogPosts.meta,
            publishedAt: blogPosts.publishedAt,
          })
          .from(blogPosts)
          .where(
            and(
              eq(blogPosts.category, "saham_crypto"),
              eq(blogPosts.published, true),
            ),
          )
          .orderBy(desc(blogPosts.createdAt))
          .limit(50);
        return { posts: rows };
      },
    },
    {
      name: "admin_blog_post",
      title: "Admin Blog Post Detail",
      uriTemplate: "porto://admin/blog/post/{id}",
      description: "Detail blog post PORTO untuk drafting dan update proposal.",
      read: async (_context, variables) => {
        const id = Number(variables.id);
        const [post] = await db
          .select()
          .from(blogPosts)
          .where(eq(blogPosts.id, id))
          .limit(1);
        return { post: post ?? null };
      },
    },
  );

  registry.tools.push(
    {
      name: "blog_prepare_draft",
      title: "Prepare Blog Draft",
      description:
        "Membuat struktur draft markdown, slug, description, dan meta tanpa menulis database.",
      inputSchema: {
        title: z.string().min(1),
        brief: z.string().min(1),
        tone: z.string().optional(),
      },
      annotations: { readOnlyHint: true, idempotentHint: true },
      execute: async (_context, input) => {
        const parsed = z
          .object({
            title: z.string().min(1),
            brief: z.string().min(1),
            tone: z.string().optional(),
          })
          .parse(input);
        const slug = slugify(parsed.title);
        return {
          title: parsed.title,
          slug,
          description: parsed.brief.slice(0, 180),
          meta: `draft:${slug}`,
          content: [
            `# ${parsed.title}`,
            "",
            parsed.brief,
            "",
            "## Outline",
            "",
            "- Konteks",
            "- Pembahasan utama",
            "- Catatan implementasi",
            "- Kesimpulan",
          ].join("\n"),
          tone: parsed.tone ?? "technical editorial",
        };
      },
    },
    {
      name: "blog_propose_create",
      title: "Propose Blog Create",
      description: "Membuat approval request untuk blog post baru.",
      inputSchema: blogPayloadShape,
      annotations: { openWorldHint: false },
      execute: async (context, input) => {
        const parsed = z.object(blogPayloadShape).parse(input);
        const [row] = await db
          .insert(mcpActionRequests)
          .values({
            domain: "blog",
            action: "blog_propose_create",
            requestedBy: context.requestedBy,
            payload: { ...parsed, published: false, publishedAt: null },
          })
          .returning();
        return row;
      },
    },
    {
      name: "blog_propose_update",
      title: "Propose Blog Update",
      description: "Membuat approval request untuk update blog post.",
      inputSchema: {
        id: z.number().int().positive(),
        data: z.object(blogPayloadShape).partial(),
      },
      annotations: { openWorldHint: false },
      execute: async (context, input) => {
        const parsed = z
          .object({
            id: z.number().int().positive(),
            data: z.object(blogPayloadShape).partial(),
          })
          .parse(input);
        const [row] = await db
          .insert(mcpActionRequests)
          .values({
            domain: "blog",
            action: "blog_propose_update",
            requestedBy: context.requestedBy,
            payload: parsed,
          })
          .returning();
        return row;
      },
    },
    {
      name: "blog_propose_publish",
      title: "Propose Blog Publish",
      description: "Membuat approval request untuk publish/unpublish blog post.",
      inputSchema: {
        id: z.number().int().positive(),
        published: z.boolean(),
        publishedAt: z.string().datetime().optional(),
      },
      annotations: { openWorldHint: false },
      execute: async (context, input) => {
        const parsed = z
          .object({
            id: z.number().int().positive(),
            published: z.boolean(),
            publishedAt: z.string().datetime().optional(),
          })
          .parse(input);
        const [row] = await db
          .insert(mcpActionRequests)
          .values({
            domain: "blog",
            action: "blog_propose_publish",
            requestedBy: context.requestedBy,
            payload: parsed,
          })
          .returning();
        return row;
      },
    },
    {
      name: "blog_propose_saham_crypto_daily",
      title: "Propose Saham & Crypto Daily Report",
      description:
        "Agent cronjob harian mengirim hasil runtime Saham/Crypto sebagai proposal blog kategori saham_crypto. Membuat approval request (bukan publish langsung).",
      inputSchema: sahamCryptoDailyShape,
      annotations: { openWorldHint: false },
      execute: async (context, input) => {
        const parsed = z.object(sahamCryptoDailyShape).parse(input);

        const slug =
          parsed.slug?.trim() ||
          slugify(`saham-crypto-${parsed.marketDate}-${parsed.title}`);

        const description = parsed.summary.slice(0, 180);

        // Tag compact: saham, crypto, daily, tanggal, lalu beberapa aset pertama.
        const metaTags = [
          "saham",
          "crypto",
          "daily",
          parsed.marketDate,
          ...(parsed.assets ?? []).slice(0, 6),
        ];
        const meta = metaTags.join(", ");

        // Pastikan content markdown punya heading judul + summary di awal.
        const hasHeading = /^\s*#\s+/.test(parsed.content);
        const content = hasHeading
          ? parsed.content
          : [`# ${parsed.title}`, "", parsed.summary, "", parsed.content].join(
              "\n",
            );

        const payload = {
          title: parsed.title,
          slug,
          description,
          content,
          meta,
          category: "saham_crypto" as const,
          coverUrl: parsed.coverUrl ?? null,
          published: false,
          publishedAt: null,
        };

        const [row] = await db
          .insert(mcpActionRequests)
          .values({
            domain: "blog",
            action: "blog_propose_create",
            requestedBy: context.requestedBy,
            payload,
          })
          .returning();

        return {
          ...row,
          requestId: row.id,
          category: "saham_crypto",
          slug,
          status: row.status,
          sourceRuntime: parsed.sourceRuntime ?? null,
        };
      },
    },
  );
}

const sahamCryptoDailyShape = {
  title: z.string().min(1),
  slug: z.string().min(1).optional(),
  summary: z.string().min(1),
  content: z.string().min(1),
  marketDate: z.string().min(1), // YYYY-MM-DD; tidak terlalu strict agar runtime fleksibel
  assets: z.array(z.string()).optional(), // contoh: ["IHSG", "BBCA", "BTC", "ETH"]
  sourceRuntime: z.string().optional(), // contoh: cronjob-saham-daily
  coverUrl: z.string().nullish(),
};

const blogPayloadShape = {
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().nullish(),
  content: z.string().nullish(),
  meta: z.string().nullish(),
  category: z.preprocess(
    normalizeBlogCategory,
    z.enum(BLOG_CATEGORIES).default("global"),
  ),
  coverUrl: z.string().nullish(),
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}
