import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const rootDirectory = path.dirname(fileURLToPath(import.meta.url));
// Repo punya 2 lockfile (frontend + backend) tanpa pnpm-workspace.yaml.
// Override root supaya Next.js / Turbopack / Vercel tidak ambigu menentukan
// project root, dan output file tracing inklusif untuk monorepo deploy.
const workspaceRoot = path.resolve(rootDirectory, "..");

const nextConfig: NextConfig = {
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
    ],
  },
  outputFileTracingRoot: workspaceRoot,
  reactStrictMode: true,
  turbopack: {
    root: workspaceRoot,
  },
};

export default nextConfig;
