import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../../db/index.js";
import { blogPosts, mcpActionRequests } from "../../db/schema/index.js";
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
  );
}

const blogPayloadShape = {
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().nullish(),
  content: z.string().nullish(),
  meta: z.string().nullish(),
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
