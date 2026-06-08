import "server-only";

import { BACKEND_URL } from "@/lib/backend-url";

import type { BlogCategory, PublicBlogPost } from "./types";

/**
 * Fetch data publik langsung dari backend Hono (server-side).
 * Dipakai di Server Components / generateMetadata, di mana hook React-Query
 * (`usePublicBlogPost`) tidak tersedia. ISR 60 detik mengikuti pola route
 * `app/api/public/[...path]`.
 */
async function fetchPublicData<T>(path: string): Promise<T | null> {
  try {
    const url = `${BACKEND_URL.replace(/\/$/, "")}/api/public/${path}`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    });

    if (!response.ok) return null;

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function getPublicBlogPost(slug: string) {
  return fetchPublicData<PublicBlogPost>(
    `blog/${encodeURIComponent(slug)}`,
  );
}

export function getPublicBlogPosts(category?: BlogCategory) {
  return fetchPublicData<PublicBlogPost[]>(
    category ? `blog?category=${category}` : "blog",
  );
}
