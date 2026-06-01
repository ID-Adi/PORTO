# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository shape

Two independent pnpm projects orchestrated by root scripts (this is **not** a pnpm workspace — there is no `pnpm-workspace.yaml`; root scripts proxy via `pnpm --dir <pkg>`):

- `frontend/` — Next.js (App Router) app, the public site + admin panel + canvas.
- `backend/` — Hono server (port 4002): tRPC API, better-auth, Drizzle/Postgres, Redis, MCP bridge, AI/TTS tooling.

The two are coupled by **end-to-end tRPC types**: `frontend/tsconfig.json` aliases `@porto/api` → `../backend/src/trpc/routers/_app.ts`, and `frontend/src/lib/trpc.ts` does `createTRPCReact<AppRouter>()`. Backend type changes flow into the frontend at compile time.

## Commands

From repo root:
```bash
pnpm install:frontend / install:backend   # install deps per package
pnpm dev:frontend                          # Next dev server on :3000
pnpm dev:backend                           # Hono via tsx watch on :4002 (needs backend/.env)
pnpm build:frontend                        # next build (uses --webpack, not turbopack)
pnpm lint:frontend                         # eslint
pnpm db:up / db:down                       # docker compose up -d / down (postgres+redis+services)
pnpm db:generate / db:migrate / db:studio  # drizzle-kit (proxy into backend/)
```

From `backend/` (more scripts live here):
```bash
pnpm dev                 # run server (tsx, no build step — TS runs directly)
pnpm db:generate         # drizzle-kit generate (after editing src/db/schema/*)
pnpm db:migrate          # apply migrations
pnpm db:seed:admin       # also: site, projects, skills, experience, socials, overview
pnpm mcp:stdio           # run MCP server over stdio (for Claude/Cursor local config)
```

**Validation before commit:** there is no test suite. Validate with `pnpm lint:frontend`, `pnpm build:frontend`, and `pnpm exec tsc --noEmit` in the relevant package (backend has no build step, so `tsc --noEmit` is the type gate). Backend changes that touch `src/db/schema/*` require `pnpm db:generate` to produce a migration.

## Commit style

Imperative, scoped prefix matching the area touched:
```
frontend: refactor homepage layout
backend: handle json-rpc notifications in mcp bridge
canvas: implement model switcher for chat agent
docs: update visual direction
```

## Backend architecture

Entry: `backend/src/index.ts` mounts, in order that matters:
- `/api/auth/:path{.+}` → better-auth handler. Password-reset routes are registered as individual `app.post()` **before** the auth catch-all (a Hono sub-router would 404-intercept auth routes).
- `/api/canvas-agent` → SSE streaming for the canvas agent.
- `/api/mcp` → MCP JSON-RPC bridge for external agents.
- `/api/upload` → file upload; `/uploads/*` → static serve from a Docker volume.
- `/api/trpc/*` → the tRPC `appRouter` (`src/trpc/routers/_app.ts`, ~15 sub-routers).

ESM: backend is `"type": "module"`; relative imports use `.js` extensions even for `.ts` files (e.g. `import { x } from "./foo.js"`). Match this.

**Auth & CORS** (`src/auth/index.ts`, `src/index.ts`): better-auth email/password with a non-input `role` field. CORS allowlist = localhost + `pawa.my.id`/`*.pawa.my.id` only; `credentials: true`; `/api/*` forced `Cache-Control: no-store` so a CDN can't cache CORS-less responses. `trustedOrigins` comes from `FRONTEND_URL`. Cross-subdomain cookies via `COOKIE_DOMAIN` — `resolveCookieDomain()` **throws at module load** if it's set but malformed (this can crash startup).

**Database** (`src/db/`): Drizzle ORM over Postgres (`postgres` driver). Schema in `src/db/schema/`, migrations in `src/db/migrations/` (drizzle-kit, config at `backend/drizzle.config.ts`, reads `DATABASE_URL`). `ai_tool_settings` is a **singleton row (id=1)** holding TTS / canvas-agent / provider config.

**Secrets**: provider API keys and Vertex service-account JSON are encrypted at rest (AES-256-GCM) via `src/lib/encrypted-secret.ts`, keyed by `AI_CONFIG_ENCRYPTION_KEY`. The frontend only ever receives `hasKey`/`last4`, never plaintext. Base URLs that aren't secrets (e.g. the local LLM Tailscale URL) are stored plaintext.

**AI providers** (`src/lib/tts-providers.ts`, `tts-openai-audio.ts`, `canvas-agent-runner.ts`): `gemini` (AI Studio), `vertex` (SA JSON → OAuth), `openrouter`, and `local` (OpenAI-compatible, e.g. Ollama via Tailscale, no API key). Model lists are fetched live; "Test connection" probes the provider. Caveat: `listProviderModels` swallows Vertex errors to keep a fallback list for the TTS UI — connection testing must use the throwing `probeVertexModels` path.

**Canvas agent**: `canvas_agent_workflows/messages/runs/proposals` tables. The SSE route (`src/routes/canvas-agent-stream.ts`) runs a job inline and threads the request `AbortSignal` into the provider call, so client "Stop" actually cancels the run (marked `cancelled`). Redis (`ioredis`, `REDIS_URL`) backs the canvas scene cache (`src/lib/scene-cache.ts`).

**MCP** (`src/mcp/`): `registry.ts` + `server.ts` expose domain tools; `stdio.ts` is the stdio transport. External agents authenticate with a static token whose SHA-256 hash is stored on `ai_tool_settings`.

## Frontend architecture

```
frontend/src/
├── app/         # App Router routes/pages/API; (admin) group; canvas/; admin/
├── components/  # ui/ (shadcn, style "radix-nova"), anim/, common/
├── features/    # domain features: sections/, components/, data/, types/
├── context/     # Theme, Query, AppProviders
├── lib/         # trpc.ts, backend-url.ts, query-client, cn utils
└── services/    # API clients & integrations
```

- **Routing**: App Router only; `app/page.tsx` composes from `features/`. Path alias `@/*` → `src/*`. New shadcn components go in `components/ui/`.
- **Theme**: dark/light persisted in `localStorage` key `porto-theme`, hydrated by an inline `<script>` in the root layout — no state library.
- **Data**: TanStack Query + tRPC client pointed at `BACKEND_URL` (`src/lib/backend-url.ts` = `NEXT_PUBLIC_BACKEND_URL ?? http://localhost:4002`).
- **Canvas** (`app/canvas/`): the agent chat panel renders *inside* the Excalidraw DOM, which has global `user-select`/copy/scroll handlers — panel widgets must `stopPropagation` on wheel/touch/copy/cut to avoid Excalidraw hijacking them. Assistant messages render Markdown (`react-markdown` + `remark-gfm`).

Comments throughout the codebase are frequently written in Indonesian; match the surrounding language and density.

## Deployment (docker-compose.yml)

Services: `postgres` (16), `redis` (7), `backend` (published to `127.0.0.1:4002`), `frontend` (Next standalone, `127.0.0.1:3001:3000`). Public ingress: **frontend via Cloudflare Tunnel** → localhost:3001; **backend via Caddy** (external `caddy` network) at `api.pawa.my.id`.

Critical deploy gotchas:
- **`NEXT_PUBLIC_*` are inlined at build time**, passed as Docker **build args** (`frontend/Dockerfile`). Changing the backend URL etc. requires **rebuilding the frontend image** (`docker compose build frontend`), not just a restart. Root `.env` supplies Postgres creds and can override these args; the compose default for `NEXT_PUBLIC_BACKEND_URL` is `https://api.pawa.my.id`.
- **Frontend Docker build context = repo root** (not `frontend/`), because the build type-checks the imported backend `AppRouter`.
- The backend container entrypoint runs `drizzle-kit migrate` (`set -e`) **before** starting — a failed migration blocks the whole backend from coming up.

## Design direction

Minimalist technical/editorial — monochrome palette, thin borders, quiet texture, strong typographic hierarchy. Decisions documented in `docs/catolta1.md`, `docs/detail_visual.md`, `docs/techstack.md`.
