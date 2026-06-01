import { unstable_cache } from "next/cache";

import { BACKEND_URL } from "@/lib/backend-url";

const PUBLIC_REVALIDATE_SECONDS = 60;
const PUBLIC_STALE_SECONDS = 300;

const cacheHeaders = {
  "Cache-Control": `public, s-maxage=${PUBLIC_REVALIDATE_SECONDS}, stale-while-revalidate=${PUBLIC_STALE_SECONDS}`,
};

const emptyHomeData = {
  settings: null,
  overview: [],
  socials: [],
  skills: [],
  blog: [],
  experience: [],
  projects: [],
  bookmarks: [],
};

type PublicRouteContext = {
  params: Promise<{ path?: string[] }>;
};

function normalizePublicPath(parts: string[]): string | null {
  if (parts.length === 1) {
    const [resource] = parts;
    if (
      resource === "home" ||
      resource === "site-settings" ||
      resource === "command" ||
      resource === "projects" ||
      resource === "skills" ||
      resource === "experience" ||
      resource === "blog" ||
      resource === "contact"
    ) {
      return resource;
    }
  }

  if (parts.length === 2 && parts[0] === "blog" && parts[1]) {
    return `blog/${encodeURIComponent(parts[1])}`;
  }

  return null;
}

function fallbackForPath(path: string): unknown {
  if (path === "home") return emptyHomeData;
  if (path === "site-settings") return null;
  if (path === "command") return { skills: [], blog: [], socials: [] };
  if (path === "contact") return { socials: [] };
  if (path.startsWith("blog/")) return null;
  return [];
}

const fetchCachedPublicData = unstable_cache(
  async (backendUrl: string, path: string) => {
    const url = `${backendUrl.replace(/\/$/, "")}/api/public/${path}`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Public data request failed: ${response.status}`);
    }

    return response.json() as Promise<unknown>;
  },
  ["porto-public-data-v1"],
  {
    revalidate: PUBLIC_REVALIDATE_SECONDS,
    tags: ["porto-public-data"],
  },
);

export async function GET(_request: Request, context: PublicRouteContext) {
  const { path: pathParts = [] } = await context.params;
  const path = normalizePublicPath(pathParts);

  if (!path) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const data = await fetchCachedPublicData(BACKEND_URL, path);
    return Response.json(data, { headers: cacheHeaders });
  } catch (err) {
    console.error("[api/public] Falling back to empty data:", err);
    return Response.json(fallbackForPath(path), {
      headers: {
        ...cacheHeaders,
        "x-porto-public-data-fallback": "1",
      },
    });
  }
}
