import { publicProcedure, router } from "../init.js";

export type ReadingItem = {
  title: string;
  excerpt: string;
  link: string;
  domain: string;
  createdAt: string;
  tags: string[];
};

const RAINDROP_ENDPOINT = "https://api.raindrop.io/rest/v1/raindrops";
const TTL_MS = 5 * 60 * 1000;
const PER_PAGE = 5;

let cache: { data: ReadingItem[]; expiresAt: number } | null = null;

type RaindropApiItem = {
  title?: string;
  excerpt?: string;
  link?: string;
  domain?: string;
  created?: string;
  tags?: string[];
};

async function fetchFromRaindrop(): Promise<ReadingItem[]> {
  const token = process.env.RAINDROP_API_TOKEN;
  if (!token) return [];

  const collectionId = process.env.RAINDROP_COLLECTION_ID ?? "0";
  const url = `${RAINDROP_ENDPOINT}/${collectionId}?perpage=${PER_PAGE}&sort=-created`;

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

export const bookmarksRouter = router({
  list: publicProcedure.query(async () => {
    if (cache && Date.now() < cache.expiresAt) {
      return cache.data;
    }
    try {
      const data = await fetchFromRaindrop();
      cache = { data, expiresAt: Date.now() + TTL_MS };
      return data;
    } catch (err) {
      console.error("[bookmarks.list] Raindrop fetch failed:", err);
      return [] as ReadingItem[];
    }
  }),
});
