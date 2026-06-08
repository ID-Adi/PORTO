# syntax=docker/dockerfile:1
# =============================================================================
# PORTO frontend — Next.js 16 (standalone output) untuk Docker Compose.
#
# PENTING: build context = REPO ROOT (lihat docker-compose.yml), bukan ./frontend.
# Frontend meng-import tipe AppRouter dari backend via path alias tsconfig
# `@porto/api` → ../backend/src/trpc/routers/_app.ts (type-only, untuk
# type-safety tRPC end-to-end). Karena itu type-check saat build butuh source
# backend + dependency-nya ada di ../backend. Import ini di-erase saat runtime,
# jadi image runner tetap ramping (hanya standalone frontend).
# =============================================================================

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.22.0 --activate
# pnpm 10 menolak postinstall build (sharp, esbuild, dst.) di mode non-interaktif
# tanpa flag ini. allowBuilds di pnpm-workspace.yaml mengizinkan paket relevan.
ENV PNPM_CONFIG_DANGEROUSLY_ALLOW_ALL_BUILDS=true
WORKDIR /app

# ──────────────────────────────────────────────────────────────────────────
# deps — install dependency frontend & backend (backend hanya untuk type-check
# AppRouter). Lockfile frozen → reproducible.
# ──────────────────────────────────────────────────────────────────────────
FROM base AS deps
COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml ./frontend/
COPY frontend/patches ./frontend/patches
RUN cd frontend && pnpm install --frozen-lockfile
COPY backend/package.json backend/pnpm-lock.yaml backend/pnpm-workspace.yaml ./backend/
RUN cd backend && pnpm install --frozen-lockfile

# ──────────────────────────────────────────────────────────────────────────
# builder — compile Next.js. NEXT_PUBLIC_* di-inline di sini → harus build arg.
# ──────────────────────────────────────────────────────────────────────────
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
# Trace standalone dari root proyek frontend (bukan parent ala monorepo).
ENV NEXT_FILE_TRACING_ROOT=/app/frontend
COPY --from=deps /app/frontend/node_modules ./frontend/node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY frontend ./frontend
COPY backend ./backend

ARG NEXT_PUBLIC_BACKEND_URL
ARG NEXT_PUBLIC_ADMIN_EMAIL
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_ADMIN_EMAIL=$NEXT_PUBLIC_ADMIN_EMAIL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

WORKDIR /app/frontend
# Headroom heap untuk type-check Next.js: inferensi tipe tRPC end-to-end
# (inferRouterOutputs<AppRouter>) berat memori. Di builder ber-RAM kecil,
# `next build` bisa OOM saat fase "checking validity of types" — beri 4GB.
ENV NODE_OPTIONS=--max-old-space-size=4096
# prebuild (sync-excalidraw-assets) jalan otomatis sebelum `next build`.
RUN pnpm build

# ──────────────────────────────────────────────────────────────────────────
# runner — image minimal: hanya standalone server + static + public.
# ──────────────────────────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Standalone bundle (server.js + node_modules minimal). Karena tracing root =
# /app/frontend, server.js berada di root standalone.
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/standalone ./
# Static & public tidak ikut standalone — copy manual.
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/frontend/public ./public

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null 2>&1 || exit 1

CMD ["node", "server.js"]
