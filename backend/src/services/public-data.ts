import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "../db/index.js";
import {
  type BlogCategory,
  blogPosts,
  experienceCompanies,
  experiencePositions,
  profileOverview,
  projects,
  projectTags,
  siteSettings,
  skills,
  socials,
  tags,
} from "../db/schema/index.js";
import { publicUrl } from "../lib/public-url.js";

const RAINDROP_ENDPOINT = "https://api.raindrop.io/rest/v1/raindrops";
const BOOKMARK_TTL_MS = 5 * 60 * 1000;
const BOOKMARK_PER_PAGE = 5;

const SINGLETON_SITE_SETTINGS_ID = 1;

type ProjectRow = typeof projects.$inferSelect;
type SkillRow = typeof skills.$inferSelect;
type SocialRow = typeof socials.$inferSelect;
type SiteSettingsRow = typeof siteSettings.$inferSelect;
type ExperienceCompanyRow = typeof experienceCompanies.$inferSelect;
type ExperiencePositionRow = typeof experiencePositions.$inferSelect;

export type ReadingItem = {
  title: string;
  excerpt: string;
  link: string;
  domain: string;
  createdAt: string;
  tags: string[];
};

type RaindropApiItem = {
  title?: string;
  excerpt?: string;
  link?: string;
  domain?: string;
  created?: string;
  tags?: string[];
};

let bookmarkCache: { data: ReadingItem[]; expiresAt: number } | null = null;

function withProjectPublicUrls(row: ProjectRow): ProjectRow {
  return {
    ...row,
    imageUrl: publicUrl(row.imageUrl),
  };
}

function withBlogPublicUrls<T extends { coverUrl: string | null }>(row: T): T {
  return {
    ...row,
    coverUrl: publicUrl(row.coverUrl),
  };
}

function withSkillPublicUrls(row: SkillRow): SkillRow {
  return {
    ...row,
    iconUrl: publicUrl(row.iconUrl),
  };
}

function withSocialPublicUrls(row: SocialRow): SocialRow {
  return {
    ...row,
    iconUrl: publicUrl(row.iconUrl),
  };
}

function withSiteSettingsPublicUrls(row: SiteSettingsRow): SiteSettingsRow {
  return {
    ...row,
    logoUrl: publicUrl(row.logoUrl),
    avatarUrl: publicUrl(row.avatarUrl),
  };
}

function withExperienceCompanyPublicUrls(
  row: ExperienceCompanyRow,
): ExperienceCompanyRow {
  return {
    ...row,
    logoUrl: publicUrl(row.logoUrl),
  };
}

async function loadProjectTags(projectIds: number[]): Promise<Map<number, string[]>> {
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
  for (const row of rows) {
    const values = map.get(row.projectId) ?? [];
    values.push(row.name);
    map.set(row.projectId, values);
  }
  return map;
}

async function loadExperiencePositions(
  companyIds: number[],
): Promise<Map<number, ExperiencePositionRow[]>> {
  if (companyIds.length === 0) return new Map();

  const rows = await db
    .select()
    .from(experiencePositions)
    .where(inArray(experiencePositions.companyId, companyIds))
    .orderBy(asc(experiencePositions.sortOrder));

  const map = new Map<number, ExperiencePositionRow[]>();
  for (const row of rows) {
    const values = map.get(row.companyId) ?? [];
    values.push(row);
    map.set(row.companyId, values);
  }
  return map;
}

async function fetchBookmarksFromRaindrop(): Promise<ReadingItem[]> {
  const token = process.env.RAINDROP_API_TOKEN;
  if (!token) return [];

  const collectionId = process.env.RAINDROP_COLLECTION_ID ?? "0";
  const url = `${RAINDROP_ENDPOINT}/${collectionId}?perpage=${BOOKMARK_PER_PAGE}&sort=-created`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Raindrop API ${res.status}`);
  }

  const json = (await res.json()) as { items?: RaindropApiItem[] };
  const items = json.items ?? [];

  return items.map((item) => ({
    title: item.title ?? "Untitled",
    excerpt: item.excerpt ?? "",
    link: item.link ?? "#",
    domain: item.domain ?? "",
    createdAt: item.created ?? new Date().toISOString(),
    tags: item.tags ?? [],
  }));
}

export async function listPublicProjects() {
  const rows = await db
    .select()
    .from(projects)
    .orderBy(projects.sortOrder, desc(projects.createdAt));
  const tagMap = await loadProjectTags(rows.map((row) => row.id));

  return rows.map((row) => ({
    ...withProjectPublicUrls(row),
    tags: tagMap.get(row.id) ?? [],
  }));
}

export async function listPublicSkills() {
  const rows = await db
    .select()
    .from(skills)
    .orderBy(asc(skills.sortOrder), desc(skills.createdAt));

  return rows.map(withSkillPublicUrls);
}

export async function listPublicExperience() {
  const companies = await db
    .select()
    .from(experienceCompanies)
    .orderBy(asc(experienceCompanies.sortOrder), desc(experienceCompanies.createdAt));
  const positionsMap = await loadExperiencePositions(companies.map((c) => c.id));

  return companies.map((company) => ({
    ...withExperienceCompanyPublicUrls(company),
    positions: positionsMap.get(company.id) ?? [],
  }));
}

// Batas aman list publik: halaman /blog belum punya pagination, jadi cap di
// server agar laporan harian cronjob tidak membuat payload tumbuh tanpa batas.
const PUBLIC_BLOG_LIST_LIMIT = 100;

export async function listPublicBlogPosts(category?: BlogCategory) {
  const where = category
    ? and(eq(blogPosts.published, true), eq(blogPosts.category, category))
    : eq(blogPosts.published, true);

  // Proyeksi tanpa `content`: list/index hanya butuh metadata kartu; body
  // markdown (bisa puluhan KB per laporan) hanya dikirim endpoint detail.
  const rows = await db
    .select({
      id: blogPosts.id,
      title: blogPosts.title,
      slug: blogPosts.slug,
      description: blogPosts.description,
      meta: blogPosts.meta,
      category: blogPosts.category,
      coverUrl: blogPosts.coverUrl,
      published: blogPosts.published,
      publishedAt: blogPosts.publishedAt,
      createdAt: blogPosts.createdAt,
    })
    .from(blogPosts)
    .where(where)
    .orderBy(
      desc(sql`coalesce(${blogPosts.publishedAt}, ${blogPosts.createdAt})`),
    )
    .limit(PUBLIC_BLOG_LIST_LIMIT);

  return rows.map(withBlogPublicUrls);
}

export async function getPublishedBlogPostBySlug(slug: string) {
  const [row] = await db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.slug, slug))
    .limit(1);

  if (!row?.published) return null;
  return withBlogPublicUrls(row);
}

export async function listPublicSocials() {
  const rows = await db
    .select()
    .from(socials)
    .orderBy(asc(socials.sortOrder), desc(socials.createdAt));

  return rows.map(withSocialPublicUrls);
}

export async function listPublicProfileOverview() {
  return db
    .select()
    .from(profileOverview)
    .orderBy(asc(profileOverview.sortOrder), desc(profileOverview.createdAt));
}

export async function getPublicSiteSettings() {
  const [row] = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.id, SINGLETON_SITE_SETTINGS_ID))
    .limit(1);

  return row ? withSiteSettingsPublicUrls(row) : null;
}

export async function listPublicBookmarks() {
  if (bookmarkCache && Date.now() < bookmarkCache.expiresAt) {
    return bookmarkCache.data;
  }

  try {
    const data = await fetchBookmarksFromRaindrop();
    bookmarkCache = { data, expiresAt: Date.now() + BOOKMARK_TTL_MS };
    return data;
  } catch (err) {
    console.error("[public-data.bookmarks] Raindrop fetch failed:", err);
    return [] as ReadingItem[];
  }
}

async function settle<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[public-data.home] Slice failed:", message);
    return fallback;
  }
}

export async function getPublicHomeData() {
  const [
    settings,
    overview,
    socialsData,
    skillsData,
    blogData,
    experienceData,
    projectsData,
    bookmarksData,
  ] = await Promise.all([
    settle(getPublicSiteSettings(), null),
    settle(listPublicProfileOverview(), []),
    settle(listPublicSocials(), []),
    settle(listPublicSkills(), []),
    // Home showcase tetap editorial global; laporan Saham/Crypto tidak mencampur.
    settle(listPublicBlogPosts("global"), []),
    settle(listPublicExperience(), []),
    settle(listPublicProjects(), []),
    settle(listPublicBookmarks(), []),
  ]);

  return {
    settings,
    overview,
    socials: socialsData,
    skills: skillsData,
    blog: blogData,
    experience: experienceData,
    projects: projectsData,
    bookmarks: bookmarksData,
  };
}

export async function getPublicCommandData() {
  const [skillsData, blogData, socialsData] = await Promise.all([
    settle(listPublicSkills(), []),
    // Command menu tetap editorial global.
    settle(listPublicBlogPosts("global"), []),
    settle(listPublicSocials(), []),
  ]);

  return {
    skills: skillsData,
    blog: blogData,
    socials: socialsData,
  };
}
