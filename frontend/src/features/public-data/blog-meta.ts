export const BLOG_CATEGORIES = [
  "global",
  "saham_crypto",
  "study",
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

export const BLOG_CATEGORY_LABELS: Record<BlogCategory, string> = {
  global: "Global",
  saham_crypto: "Saham & Crypto",
  study: "Study",
};

export function isBlogCategory(value: unknown): value is BlogCategory {
  return (
    typeof value === "string" &&
    (BLOG_CATEGORIES as readonly string[]).includes(value)
  );
}

export function getBlogCategoryLabel(
  category: BlogCategory | string | null | undefined,
): string {
  return isBlogCategory(category) ? BLOG_CATEGORY_LABELS[category] : "Global";
}

/**
 * Pecah field `meta` (string tag dipisah koma) menjadi array tag bersih.
 * Contoh: "RAG, Qdrant, AI" -> ["RAG", "Qdrant", "AI"].
 * Toleran terhadap spasi ganda, koma di ujung, dan separator tanpa spasi.
 */
export function parseBlogTags(meta: string | null | undefined): string[] {
  if (!meta) return [];
  return meta
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}
