import { NextResponse } from "next/server";

import { BACKEND_URL } from "@/lib/backend-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function allowedHost(target: URL): boolean {
  try {
    const backend = new URL(BACKEND_URL);
    if (target.host === backend.host) return true;
  } catch {
    /* ignore */
  }
  // Whitelist tambahan untuk environment prod yang tidak menyetel BACKEND_URL.
  const extra = new Set(["porto-api.pawa.my.id", "localhost:4002"]);
  return extra.has(target.host);
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

  const upstream = await fetch(target.toString(), {
    method: "GET",
    redirect: "follow",
    cache: "no-store",
  });

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
