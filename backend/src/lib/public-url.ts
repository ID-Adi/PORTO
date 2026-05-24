const BASE = process.env.PUBLIC_BACKEND_URL?.replace(/\/$/, "") ?? "";

/**
 * Konversi path relatif (mis. "/uploads/foo.png") menjadi URL absolut
 * `${PUBLIC_BACKEND_URL}/uploads/foo.png`. Diperlukan karena frontend di
 * Vercel (`pawa.my.id`) tidak share filesystem dengan backend VPS
 * (mis. `porto-api.pawa.my.id`); semua file harus dirujuk lewat host backend.
 *
 * Dev mode (`PUBLIC_BACKEND_URL` kosong) → passthrough relatif supaya
 * sama-origin tetap jalan dari `localhost:3000` ke `localhost:4002` lewat
 * proxy/dev rewrites (atau langsung relative kalau backend serve frontend).
 *
 * URL absolut (https://...) di input akan di-passthrough utuh — supaya
 * external CDN URL (Cloudinary, dst.) tidak ke-rewrite.
 */
export function publicUrl(relativePath: string): string;
export function publicUrl(relativePath: null | undefined): null;
export function publicUrl(
  relativePath: string | null | undefined,
): string | null;
export function publicUrl(
  relativePath: string | null | undefined,
): string | null {
  if (!relativePath) return null;
  if (/^https?:\/\//i.test(relativePath)) return relativePath;
  if (!BASE) return relativePath;
  const p = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
  return `${BASE}${p}`;
}
