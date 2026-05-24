import { NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@porto/api";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4001";
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
const MAX_BYTES = 2 * 1024 * 1024;
// SVG sengaja tidak diizinkan: dapat berisi <script>/event handlers yang
// dieksekusi sebagai stored XSS bila diakses langsung dari /uploads/*.
const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

async function getSession(req: Request) {
  const cookie = req.headers.get("cookie") ?? "";
  const res = await fetch(`${BACKEND_URL}/api/auth/get-session`, {
    headers: { cookie },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as { user?: { email?: string } } | null;
}

function backendClient(cookie: string) {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${BACKEND_URL}/api/trpc`,
        headers: () => ({ cookie }),
      }),
    ],
  });
}

function sanitizeFilename(name: string) {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]+/g, "-");
  return base.slice(0, 80) || "file";
}

function buildStoredFilename(originalName: string) {
  return `${randomUUID()}-${sanitizeFilename(originalName)}`;
}

export async function POST(req: Request) {
  const session = await getSession(req);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (ADMIN_EMAIL && session.user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const alt = (form.get("alt") as string | null) ?? null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported type: ${file.type}` },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File too large (max 2MB)" },
      { status: 413 },
    );
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });

  const filename = buildStoredFilename(file.name);
  const filepath = path.join(uploadsDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  const url = `/uploads/${filename}`;
  const cookie = req.headers.get("cookie") ?? "";
  const client = backendClient(cookie);

  try {
    const row = await client.media.create.mutate({
      filename,
      url,
      mimeType: file.type,
      size: file.size,
      alt,
      uploadedBy: session.user.email ?? null,
    });
    return NextResponse.json(row);
  } catch (err) {
    console.error(
      "media.create failed",
      err instanceof Error ? err.message : String(err),
    );
    await unlink(filepath).catch(() => {
      // file mungkin sudah hilang; abaikan
    });
    return NextResponse.json(
      { error: "Failed to save media record" },
      { status: 500 },
    );
  }
}
