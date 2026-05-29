import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const rootDirectory = path.dirname(fileURLToPath(import.meta.url));
// Repo punya 2 lockfile (frontend + backend) tanpa pnpm-workspace.yaml.
// Override root supaya Next.js / Turbopack / Vercel tidak ambigu menentukan
// project root, dan output file tracing inklusif untuk monorepo deploy.
//
// Default (Vercel/monorepo) = parent dir. Untuk build Docker — di mana hanya
// folder `frontend/` yang di-copy ke /app — set NEXT_FILE_TRACING_ROOT=/app
// supaya standalone output ter-trace dari root container, bukan parent yang
// tidak ada. Default tidak berubah, jadi build Vercel tetap identik.
const workspaceRoot = process.env.NEXT_FILE_TRACING_ROOT
  ? path.resolve(process.env.NEXT_FILE_TRACING_ROOT)
  : path.resolve(rootDirectory, "..");

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4002";
const legacyUploadHostname = "porto-api.pawa.my.id";
const legacyUploadUrl = `https://${legacyUploadHostname}`;
const cloudflareInsightsScriptUrl = "https://static.cloudflareinsights.com";
const cloudflareInsightsConnectUrl = "https://cloudflareinsights.com";
// Font & script Perplexity diinjeksi Cloudflare Zaraz / AI assistant widget
const perplexityCdn = "https://frontend-cdn.perplexity.ai";
const perplexityWildcard = "https://*.perplexity.ai";

// Parse backend URL untuk membuat allow-listed remotePattern + CSP source.
const backendRemotePattern = (() => {
  try {
    const parsed = new URL(backendUrl);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return {
        protocol: parsed.protocol.replace(":", "") as "http" | "https",
        hostname: parsed.hostname,
      };
    }
  } catch {
    // ignore — fall through ke null
  }
  return null;
})();

const connectSrc = [
  "'self'",
  backendUrl,
  "https://api.github.com",
  "https://*.pawa.my.id",
  cloudflareInsightsConnectUrl,
  perplexityWildcard,
].join(" ");

const imgSrc = [
  "'self'",
  "data:",
  "blob:",
  "https://cdn.simpleicons.org",
  "https://img.icons8.com",
  backendUrl,
  legacyUploadUrl,
].join(" ");

// media-src mengatur <video>/<audio> — tanpa directive ini fallback ke
// default-src 'self' yang memblokir video dari api.pawa.my.id.
const mediaSrc = [
  "'self'",
  "blob:",
  backendUrl,
  legacyUploadUrl,
].join(" ");

const fontSrc = [
  "'self'",
  "data:",
  perplexityCdn,
].join(" ");

const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  "'unsafe-eval'",
  cloudflareInsightsScriptUrl,
  perplexityWildcard,
].join(" ");

const scriptSrcElem = [
  "'self'",
  "'unsafe-inline'",
  cloudflareInsightsScriptUrl,
  perplexityWildcard,
].join(" ");

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  `img-src ${imgSrc}`,
  `media-src ${mediaSrc}`,
  `font-src ${fontSrc}`,
  "style-src 'self' 'unsafe-inline'",
  // Next.js menyuntikkan inline bootstrap script & runtime; unsafe-inline tetap
  // dibutuhkan sampai migrasi ke nonce-based CSP.
  `script-src ${scriptSrc}`,
  `script-src-elem ${scriptSrcElem}`,
  `connect-src ${connectSrc}`,
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key:    "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  // Standalone output → server.js + node_modules minimal untuk runtime Docker.
  // Tidak berpengaruh ke Vercel (Vercel mengabaikan output mode ini).
  output: "standalone",
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    qualities: [75, 100],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.simpleicons.org",
      },
      {
        protocol: "https",
        hostname: "img.icons8.com",
      },
      {
        protocol: "https",
        hostname: legacyUploadHostname,
      },
      // Backend menjadi authority untuk file dinamis (uploads, generations).
      // Pattern di-derive dari NEXT_PUBLIC_BACKEND_URL build-time.
      ...(backendRemotePattern ? [backendRemotePattern] : []),
    ],
  },
  outputFileTracingRoot: workspaceRoot,
  reactStrictMode: true,
  turbopack: {
    root: workspaceRoot,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
