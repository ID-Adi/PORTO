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
