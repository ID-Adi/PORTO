import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const rootDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(rootDirectory, "..");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@porto/backend"],
  turbopack: {
    root: workspaceRoot,
  },
};

export default nextConfig;
