import type { NextRequest } from "next/server";

import { BACKEND_URL } from "@/lib/backend-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FORWARD_REQUEST_HEADERS = ["Range", "If-Range"] as const;
const FORWARD_RESPONSE_HEADERS = [
  "Content-Type",
  "Content-Length",
  "Content-Range",
  "Accept-Ranges",
  "Last-Modified",
  "ETag",
] as const;

function allowedHost(target: URL): boolean {
  try {
    const backend = new URL(BACKEND_URL);
    if (target.host === backend.host) return true;
  } catch {
    /* ignore */
  }
  const extra = new Set(["porto-api.pawa.my.id", "localhost:4002"]);
  return extra.has(target.host);
}

export async function GET(request: NextRequest): Promise<Response> {
  const raw = request.nextUrl.searchParams.get("url");
  if (!raw) {
    return new Response(JSON.stringify({ error: "Missing url parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid url" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return new Response(JSON.stringify({ error: "Unsupported protocol" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!allowedHost(target)) {
    return new Response(JSON.stringify({ error: "Host not allowed" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Forward Range dan If-Range agar browser bisa stream dan seek secara native.
  const upstreamHeaders: Record<string, string> = {};
  for (const h of FORWARD_REQUEST_HEADERS) {
    const v = request.headers.get(h);
    if (v) upstreamHeaders[h] = v;
  }

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), {
      method: "GET",
      headers: upstreamHeaders,
      redirect: "follow",
      cache: "no-store",
    });
  } catch {
    return new Response(JSON.stringify({ error: "Upstream unreachable" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 200 (full) dan 206 (partial) keduanya valid untuk video streaming.
  if (upstream.status !== 200 && upstream.status !== 206) {
    return new Response(
      JSON.stringify({ error: `Upstream returned ${upstream.status}` }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  const responseHeaders = new Headers();
  for (const h of FORWARD_RESPONSE_HEADERS) {
    const v = upstream.headers.get(h);
    if (v) responseHeaders.set(h, v);
  }

  // Pastikan browser tahu konten ini bisa di-cache dan di-range.
  if (!responseHeaders.has("Accept-Ranges")) {
    responseHeaders.set("Accept-Ranges", "bytes");
  }
  // Cache agresif di sisi browser — video tidak berubah setelah di-generate.
  responseHeaders.set("Cache-Control", "public, max-age=86400, immutable");
  // Izinkan embed dari origin frontend (untuk Vercel ↔ backend VPS).
  responseHeaders.set("Access-Control-Allow-Origin", "*");

  return new Response(upstream.body, {
    status: upstream.status, // 200 atau 206
    headers: responseHeaders,
  });
}
