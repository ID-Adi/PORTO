import { NextResponse } from "next/server";

import { BACKEND_URL } from "@/lib/backend-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_INTERNAL_URL =
  process.env.BACKEND_INTERNAL_URL ?? "http://porto-backend:4002";
const PUBLIC_BACKEND_HOSTS = new Set([
  "api.pawa.my.id",
  "porto-api.pawa.my.id",
]);

function allowedHost(target: URL): boolean {
  try {
    const backend = new URL(BACKEND_URL);
    if (target.host === backend.host) return true;
  } catch {
    /* ignore */
  }
  // Whitelist tambahan untuk environment prod yang tidak menyetel BACKEND_URL.
  const extra = new Set([...PUBLIC_BACKEND_HOSTS, "localhost:4002"]);
  return extra.has(target.host);
}

function upstreamUrlFor(target: URL): URL {
  const shouldUseInternalBackend =
    PUBLIC_BACKEND_HOSTS.has(target.hostname) &&
    target.pathname.startsWith("/uploads/");

  if (!shouldUseInternalBackend) return target;

  const upstream = new URL(target.pathname, BACKEND_INTERNAL_URL);
  upstream.search = target.search;
  return upstream;
}

function safeFileNameFromUrl(target: URL, fallback = "download"): string {
  const last = target.pathname.split("/").filter(Boolean).pop();
  if (!last) return fallback;
  // Strip karakter aneh untuk Content-Disposition.
  return last.replace(/[\r\n"\\]/g, "_");
}

export async function GET(request: Request): Promise<Response> {
  const requestUrl = new URL(request.url);
  const raw = requestUrl.searchParams.get("url");
  if (!raw) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return NextResponse.json({ error: "Unsupported protocol" }, { status: 400 });
  }

  if (!allowedHost(target)) {
    return NextResponse.json(
      { error: "Host not allowed" },
      { status: 403 },
    );
  }

  const upstreamUrl = upstreamUrlFor(target);

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl.toString(), {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: "Upstream unreachable" },
      { status: 502 },
    );
  }

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: `Upstream returned ${upstream.status}` },
      { status: 502 },
    );
  }

  const customName = requestUrl.searchParams.get("filename");
  const fileName = customName
    ? customName.replace(/[\r\n"\\]/g, "_")
    : safeFileNameFromUrl(target);

  const headers = new Headers();
  const contentType = upstream.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  const contentLength = upstream.headers.get("content-length");
  if (contentLength) headers.set("Content-Length", contentLength);
  headers.set(
    "Content-Disposition",
    `attachment; filename="${fileName}"`,
  );
  headers.set("Cache-Control", "no-store");

  return new Response(upstream.body, {
    status: 200,
    headers,
  });
}
