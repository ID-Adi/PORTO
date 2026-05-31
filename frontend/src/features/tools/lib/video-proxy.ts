// Bungkus URL video backend dengan proxy /api/video (lihat app/api/video/route.ts)
// agar browser — terutama iOS/Safari — bisa melakukan HTTP Range Request untuk
// seek + stream native, sekaligus menghindari isu CORS lintas-origin
// (frontend Vercel ↔ backend VPS).
export function getProxiedVideoUrl(url: string | null | undefined): string {
  return url ? `/api/video?url=${encodeURIComponent(url)}` : "";
}
