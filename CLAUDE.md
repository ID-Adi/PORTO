# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from the repo root via pnpm workspace:

```bash
pnpm install:frontend     # Install frontend dependencies
pnpm dev:frontend         # Start Next.js dev server
pnpm build:frontend       # Production build
pnpm lint:frontend        # ESLint
```

Or from within `frontend/`:
```bash
pnpm dev / build / lint
```

Always run `pnpm lint` and `pnpm build` before committing to validate changes.

## Commit Style

Imperative, scoped prefix:
```
frontend: refactor homepage layout
docs: update visual direction
```

## Architecture

**Monolith structure** — `frontend/` is the active app; `backend/` is reserved.

```
frontend/src/
├── app/             # Next.js App Router — routing, pages, API routes
├── assets/          # Static assets (images, fonts, icons)
├── components/      # Reusable UI
│   ├── ui/          # shadcn/ui sourced components
│   ├── anim/        # Animation primitives (e.g. ElectricBorder)
│   └── common/      # Shared widgets (CommandMenu, ThemeToggle, CopyButton, ...)
├── config/          # App-wide config (siteConfig)
├── context/         # React context providers (Theme, Query, AppProviders)
├── features/        # Domain features (e.g. home/) — sections, components, data, types
├── hooks/           # Custom React hooks
├── layout/          # Layout primitives (SiteShell, SiteHeader, SiteFooter, Panel, ScrollToTop, Icons)
├── lib/             # Pure helpers (cn utils, query-client)
├── services/        # API clients & external integrations
└── types/           # Shared type definitions
```

**Feature anatomy** (`features/<domain>/`):
- `sections/` — page-level section components
- `components/` — domain-specific UI pieces
- `data/` — typed static content (e.g. `landing-content.ts`)
- `types/` — domain-specific types

**Routing**: App Router only. Page composition happens in `app/page.tsx`, which imports from `features/`.

**Theme**: Dark/light mode persisted in `localStorage` under key `porto-theme`. Hydration via inline `<script>` in root layout — no state management library.

**shadcn/ui config**: Style `radix-nova`, RSC enabled, icon library `lucide`, path aliases via `@/*` → `src/*`. New components go in `components/ui/`.

## Design Direction

Minimalist technical/editorial — monochrome palette, thin borders, quiet texture, strong typographic hierarchy. Design decisions documented in `docs/catolta1.md`, `docs/detail_visual.md`, `docs/techstack.md`.
