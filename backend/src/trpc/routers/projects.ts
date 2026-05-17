import { desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "../../db/index.js";
import { projects, projectTags, tags } from "../../db/schema/index.js";
import { protectedProcedure, publicProcedure, router } from "../init.js";

const projectInput = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().nullish(),
  detail: z.string().nullish(),
  period: z.string().nullish(),
  imageUrl: z.string().nullish(),
  url: z.string().nullish(),
  repoUrl: z.string().nullish(),
  highlights: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  sortOrder: z.number().int().default(0),
});

function slugify(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function syncProjectTags(projectId: number, tagNames: string[]) {
  await db.delete(projectTags).where(eq(projectTags.projectId, projectId));
  if (tagNames.length === 0) return;

  const unique = Array.from(new Set(tagNames.map((t) => t.trim()).filter(Boolean)));
  const tagRows = await Promise.all(
    unique.map(async (name) => {
      const slug = slugify(name);
      const [existing] = await db
        .select()
        .from(tags)
        .where(eq(tags.slug, slug))
        .limit(1);
      if (existing) return existing;
      const [created] = await db
        .insert(tags)
        .values({ name, slug })
        .returning();
      return created;
    }),
  );
  if (tagRows.length === 0) return;
  await db.insert(projectTags).values(
    tagRows.map((t) => ({ projectId, tagId: t.id })),
  );
}

async function loadTags(projectIds: number[]): Promise<Map<number, string[]>> {
  if (projectIds.length === 0) return new Map();
  const rows = await db
    .select({
      projectId: projectTags.projectId,
      name: tags.name,
    })
    .from(projectTags)
    .innerJoin(tags, eq(tags.id, projectTags.tagId))
    .where(inArray(projectTags.projectId, projectIds));
  const map = new Map<number, string[]>();
  for (const r of rows) {
    const arr = map.get(r.projectId) ?? [];
    arr.push(r.name);
    map.set(r.projectId, arr);
  }
  return map;
}

export const projectsRouter = router({
  list: publicProcedure.query(async () => {
    const rows = await db
      .select()
      .from(projects)
      .orderBy(projects.sortOrder, desc(projects.createdAt));
    const tagMap = await loadTags(rows.map((r) => r.id));
    return rows.map((r) => ({ ...r, tags: tagMap.get(r.id) ?? [] }));
  }),
  byId: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const [row] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, input.id))
        .limit(1);
      if (!row) return null;
      const tagMap = await loadTags([row.id]);
      return { ...row, tags: tagMap.get(row.id) ?? [] };
    }),
  create: protectedProcedure
    .input(projectInput)
    .mutation(async ({ input }) => {
      const { tags: tagNames, ...rest } = input;
      const [row] = await db.insert(projects).values(rest).returning();
      await syncProjectTags(row.id, tagNames);
      return row;
    }),
  update: protectedProcedure
    .input(z.object({ id: z.number().int(), data: projectInput.partial() }))
    .mutation(async ({ input }) => {
      const { tags: tagNames, ...rest } = input.data;
      const [row] = await db
        .update(projects)
        .set({ ...rest, updatedAt: new Date() })
        .where(eq(projects.id, input.id))
        .returning();
      if (tagNames !== undefined) {
        await syncProjectTags(input.id, tagNames);
      }
      return row;
    }),
  remove: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await db.delete(projects).where(eq(projects.id, input.id));
      return { ok: true };
    }),
});
