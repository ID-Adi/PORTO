import { asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "../../db/index.js";
import {
  experienceCompanies,
  experiencePositions,
} from "../../db/schema/index.js";
import { protectedProcedure, publicProcedure, router } from "../init.js";

const positionInput = z.object({
  title: z.string().min(1),
  employmentType: z.string().nullish(),
  period: z.string().nullish(),
  periodStart: z.string().nullish(),
  periodEnd: z.string().nullish(),
  description: z.string().nullish(),
  achievements: z.array(z.string()).default([]),
  technologies: z.array(z.string()).default([]),
  sortOrder: z.number().int().default(0),
});

const companyInput = z.object({
  name: z.string().min(1),
  website: z.string().nullish(),
  location: z.string().nullish(),
  logoUrl: z.string().nullish(),
  isCurrent: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  positions: z.array(positionInput).default([]),
});

async function loadPositions(
  companyIds: number[],
): Promise<Map<number, typeof experiencePositions.$inferSelect[]>> {
  if (companyIds.length === 0) return new Map();
  const rows = await db
    .select()
    .from(experiencePositions)
    .where(inArray(experiencePositions.companyId, companyIds))
    .orderBy(asc(experiencePositions.sortOrder));
  const map = new Map<number, typeof experiencePositions.$inferSelect[]>();
  for (const r of rows) {
    const arr = map.get(r.companyId) ?? [];
    arr.push(r);
    map.set(r.companyId, arr);
  }
  return map;
}

export const experiencesRouter = router({
  list: publicProcedure.query(async () => {
    const companies = await db
      .select()
      .from(experienceCompanies)
      .orderBy(asc(experienceCompanies.sortOrder), desc(experienceCompanies.createdAt));
    const positionsMap = await loadPositions(companies.map((c) => c.id));
    return companies.map((c) => ({
      ...c,
      positions: positionsMap.get(c.id) ?? [],
    }));
  }),
  byId: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const [company] = await db
        .select()
        .from(experienceCompanies)
        .where(eq(experienceCompanies.id, input.id))
        .limit(1);
      if (!company) return null;
      const positionsMap = await loadPositions([company.id]);
      return { ...company, positions: positionsMap.get(company.id) ?? [] };
    }),
  create: protectedProcedure
    .input(companyInput)
    .mutation(async ({ input }) => {
      const { positions, ...companyData } = input;
      const [company] = await db
        .insert(experienceCompanies)
        .values(companyData)
        .returning();
      if (positions.length > 0) {
        await db.insert(experiencePositions).values(
          positions.map((p) => ({ ...p, companyId: company.id })),
        );
      }
      return company;
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        data: companyInput.partial(),
      }),
    )
    .mutation(async ({ input }) => {
      const { positions, ...companyData } = input.data;
      const [company] = await db
        .update(experienceCompanies)
        .set({ ...companyData, updatedAt: new Date() })
        .where(eq(experienceCompanies.id, input.id))
        .returning();
      if (positions !== undefined) {
        // Wholesale replace positions: simplest semantics for now.
        await db
          .delete(experiencePositions)
          .where(eq(experiencePositions.companyId, input.id));
        if (positions.length > 0) {
          await db.insert(experiencePositions).values(
            positions.map((p) => ({ ...p, companyId: input.id })),
          );
        }
      }
      return company;
    }),
  remove: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await db
        .delete(experienceCompanies)
        .where(eq(experienceCompanies.id, input.id));
      return { ok: true };
    }),
});
