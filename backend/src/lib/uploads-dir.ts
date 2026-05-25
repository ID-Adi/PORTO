import path from "node:path";

/**
 * Single source of truth lokasi penyimpanan file dinamis backend.
 *
 * WORKDIR di Docker container = /app, volume di-mount ke /app/public/uploads.
 * Dev: backend cwd = `backend/`, file masuk ke `backend/public/uploads/`.
 *
 * Path resolved jadi absolut sehingga aman dipakai untuk containment check
 * (lihat `media.remove` / `tools.deleteMyEntry`).
 */
export const UPLOADS_DIR = path.resolve(process.cwd(), "public", "uploads");
export const TOOLS_UPLOAD_DIR = path.join(UPLOADS_DIR, "tools");
export const TOOLS_REFS_DIR = path.join(TOOLS_UPLOAD_DIR, "refs");

export function sanitizeFilename(name: string): string {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]+/g, "-");
  return base.slice(0, 80) || "file";
}
