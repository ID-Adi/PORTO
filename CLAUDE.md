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
├── app/            # Next.js App Router — pages and root layout
├── modules/        # Domain features (e.g. home/) — routing, sections, data
├── components/ui/  # shadcn/ui sourced components only
├── shared/         # Config, types, reusable layout UI, helpers
└── lib/            # Utility functions (cn for classname merging)
```

**Module anatomy** (`modules/<domain>/`):
- `sections/` — page-level section components
- `components/` — domain-specific UI pieces
- `data/` — typed static content (e.g. `landing-content.ts`)

**Shared UI** (`shared/ui/`): `SiteShell`, `SiteHeader`, `SiteFooter`, `Panel`, `ScrollToTop`, `Icons` — layout primitives used across modules.

**Routing**: App Router only. Page composition happens in `app/page.tsx`, which imports from `modules/`.

**Theme**: Dark/light mode persisted in `localStorage` under key `porto-theme`. Hydration via inline `<script>` in root layout — no state management library.

**shadcn/ui config**: Style `radix-nova`, RSC enabled, icon library `lucide`, path aliases via `@/*` → `src/*`. New components go in `components/ui/`.

## Design Direction

Minimalist technical/editorial — monochrome palette, thin borders, quiet texture, strong typographic hierarchy. Design decisions documented in `docs/catolta1.md`, `docs/detail_visual.md`, `docs/techstack.md`.
