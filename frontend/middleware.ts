import { NextResponse, type NextRequest } from "next/server";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4001";

type SessionPayload = {
  user?: { email?: string | null } | null;
} | null;

async function fetchSession(cookie: string): Promise<SessionPayload> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/get-session`, {
      headers: { cookie },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as SessionPayload;
  } catch {
    return null;
  }
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  const target = request.nextUrl.pathname + request.nextUrl.search;
  loginUrl.searchParams.set("redirect", target);
  return NextResponse.redirect(loginUrl);
}

export async function middleware(request: NextRequest) {
  const cookie = request.headers.get("cookie") ?? "";
  if (!cookie) {
    return redirectToLogin(request);
  }

  const session = await fetchSession(cookie);
  if (!session?.user) {
    return redirectToLogin(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/tools/:path*"],
};
