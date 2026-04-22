# PORTO — Backend & Data-Layer Plan (TanStack Query + SEO/PWA)

## Context

This plan is the **server / data-layer counterpart** to `plan/feature-parity.md`. Where `feature-parity.md` focuses on UI behaviour mirroring `chanhdai.com`, this one wires up the data plumbing PORTO needs: a React Query cache, a real GitHub Contributions API, theme/clipboard/clock/scroll utilities decoupled from any storage, and full SEO + PWA infrastructure.

**Important divergences from `feature-parity.md`** — when the two plans disagree, this one wins for tasks it covers:
- Theme state lives in **React state only** (no `localStorage`, no `next-themes`).
- GitHub heatmap is fetched via **TanStack Query** through a Next.js API route (no `unstable_cache` wrapper here — Next's `fetch` `revalidate` handles caching).
- Component homes are PORTO's existing folders: **`src/shared/ui/`**, **`src/shared/hooks/`**, **`src/modules/home/`** — not `src/components/` or `src/hooks/`.

If `feature-parity.md` has already been executed and installed `next-themes`, **roll it back** before TASK 5 here (uninstall, drop `<ThemeProvider>`, restore class-based dark mode toggling on `<html>`).

---

## TASK 1 — Repo Audit & Conventions (do first)

Before writing any code:

1. Confirm current state matches plan assumptions:
   - `frontend/src/shared/ui/` houses layout primitives (header, footer, scroll-to-top, etc.).
   - `frontend/src/shared/hooks/` may not exist yet — create it.
   - `frontend/src/modules/home/sections/profile-sheet.tsx` contains all section render functions.
   - `frontend/src/modules/home/data/landing-content.ts` is the typed content source.
   - Existing `scroll-to-top.tsx` exists at `frontend/src/shared/ui/scroll-to-top.tsx`.
2. Use the path alias `@/*` → `./src/*` for all imports (per `tsconfig.json`).
3. **No new top-level folders** like `src/components/` or `src/hooks/` — use the existing `src/shared/` tree.

When the prompt below says `src/components/X.tsx` or `src/hooks/X.ts`, **translate to**:
- `src/components/X.tsx` → `src/shared/ui/X.tsx`
- `src/hooks/X.ts` → `src/shared/hooks/X.ts`
- `src/lib/X.ts` → `src/lib/X.ts` (this folder exists)
- `src/providers/X.tsx` → `src/shared/providers/X.tsx` (create the folder)

---

## TASK 2 — TanStack Query v5 Setup

**Install** (in `frontend/`):
```bash
pnpm add @tanstack/react-query @tanstack/react-query-devtools
```

**Files**:
- `frontend/src/lib/query-client.ts` — singleton `QueryClient` with:
  ```ts
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      gcTime: 1000 * 60 * 60 * 24,
      retry: 1,
    },
  }
  ```
- `frontend/src/shared/providers/query-provider.tsx` — `'use client'`, wraps children in `<QueryClientProvider>`. Mount `<ReactQueryDevtools initialIsOpen={false} />` only when `process.env.NODE_ENV === 'development'`.
- `frontend/src/app/layout.tsx` — wrap the existing `<body>` children with `<QueryProvider>`. Keep the current theme `<script>` for now (TASK 5 replaces it).

**Verify**: `pnpm dev` → Devtools panel visible bottom-right at `localhost:3000`.

---

## TASK 3 — GitHub Contributions: Real API + TanStack Query

### 3a. API route

`frontend/src/app/api/github-contributions/route.ts`:

- `export const revalidate = 3600` (or use `fetch(..., { next: { revalidate: 3600 } })`).
- `GET` handler: query GitHub GraphQL `https://api.github.com/graphql` with `Authorization: Bearer ${process.env.GITHUB_TOKEN}` and `GITHUB_USERNAME`.
- Query body:
  ```graphql
  query($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
              color
            }
          }
        }
      }
    }
  }
  ```
- **Always return valid JSON, never throw**:
  - Success: `{ totalContributions, weeks: ContributionWeek[] }`
  - Error / missing token: `{ totalContributions: 0, weeks: [] }` with `200` status.
- Define `ContributionWeek` and `ContributionDay` types in `frontend/src/modules/home/types/contributions.ts`.

### 3b. Hook

`frontend/src/shared/hooks/use-github-contributions.ts`:
```ts
useQuery({
  queryKey: ['github-contributions'],
  queryFn: () => fetch('/api/github-contributions').then(r => r.json()),
  staleTime: 1000 * 60 * 60,
  placeholderData: { totalContributions: 0, weeks: [] },
})
```

### 3c. Refactor section

In `frontend/src/modules/home/sections/profile-sheet.tsx` → `GitHubContributionsSection`:
- Convert to client component (or extract a child client component) and call `useGithubContributions()`.
- `isLoading` → render shimmer skeleton matching the 30-week × 7-day grid using existing `.contribution-cell` CSS in `globals.css` with a `data-loading` attribute.
- `isError || !data` → render compact empty state: "Contribution data unavailable".
- Always guard: `const weeks = Array.isArray(data?.weeks) ? data.weeks : []`. Never call `.map`/`.flatMap` on raw `data`.
- Show `totalContributions` count above the grid (replace the static label currently used).
- Keep the existing mock generator in `landing-content.ts` as the **fallback only** when the API returns empty.

### 3d. Env

`frontend/.env.local` (create if missing) and `.env.example`:
```
# GitHub Personal Access Token — needs read:user scope for contributions
GITHUB_TOKEN=
GITHUB_USERNAME=prasetya
```
Add `.env.local` to `.gitignore` if not already present.

---

## TASK 4 — Live Clock, Copy Button, Pronounce Name, Scroll-to-Top

All four are client components living under `src/shared/ui/` (or the home module when content-coupled).

### 4A. Live Clock — `frontend/src/modules/home/components/live-clock.tsx`

- `'use client'`. `useEffect` with `setInterval(tick, 1000)`; `clearInterval` on unmount.
- Time string:
  ```ts
  new Date().toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Makassar',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  ```
- Render: `HH:mm // WITA`.
- Wire-in: in `frontend/src/modules/home/components/overview-item.tsx`, when entry has `kind: 'time'`, render `<LiveClock />` instead of the static label. Mark the time entry in `landing-content.ts` accordingly.

### 4B. Copy Button — `frontend/src/shared/ui/copy-button.tsx`

- Props: `{ value: string; label?: string }`.
- On click: `navigator.clipboard.writeText(value)` then `setCopied(true)`; `setTimeout(() => setCopied(false), 2000)`.
- Lucide `Copy` ↔ `Check`. `aria-label={`Copy ${label ?? value}`}`.
- Wire-in: in `overview-item.tsx`, render `<CopyButton value={item.value} label={item.label} />` next to the value when `item.copyable === true`. Mark phone (`+62 812 345 6789`) and email (`hello@porto.dev`) entries in `landing-content.ts` with `copyable: true`.

### 4C. Pronounce Name Button — `frontend/src/shared/ui/pronounce-button.tsx`

- `'use client'`. Lazy-instantiate `new Audio('/audio/name-pronunciation.mp3')` in a `useRef`.
- States: `idle` (Lucide `Volume2`) → `playing` (3 vertical bars, CSS keyframe `height` oscillation, gated by `prefers-reduced-motion`) → revert to `idle` on `audio.onended`.
- On `audio.onerror`: render Tooltip "Audio unavailable" instead of the playing state. Do not crash.
- Replace the existing `speechSynthesis`-based button in `frontend/src/modules/home/components/profile-intro.tsx` with `<PronounceButton />`.
- Create placeholder file: `frontend/public/audio/.gitkeep` with `// TODO: replace with real /audio/name-pronunciation.mp3 recording`.

### 4D. Scroll-to-Top — upgrade `frontend/src/shared/ui/scroll-to-top.tsx`

(File already exists; **extend, don't overwrite**.)
- Bump scroll threshold to **400px**.
- Mount in `frontend/src/app/layout.tsx` so it's global (currently rendered only inside `SiteShell` — leave that mount, or move it to layout if duplicated).
- Animation: `opacity-0 translate-y-4` → `opacity-100 translate-y-0`, `transition-all duration-300`.
- Skip the `translate` portion when `window.matchMedia('(prefers-reduced-motion: reduce)').matches`.
- `aria-label="Scroll to top"`. Lucide `ArrowUp`. Fixed `bottom-6 right-6 z-50`.

---

## TASK 5 — Theme Toggle with View-Transitions Clip-Path Animation

**No `localStorage`, no `next-themes`.** State lives in React.

### 5a. Theme state

Create `frontend/src/shared/providers/theme-provider.tsx`:
- `'use client'`. Holds `theme: 'light' | 'dark'` in `useState` (default `'dark'` to match current PORTO).
- Exposes `useTheme()` hook returning `{ theme, setTheme, toggle }`.
- Side effect: `useEffect` syncs `document.documentElement.classList` and `data-theme` attribute when `theme` changes.
- Mount in `frontend/src/app/layout.tsx` **inside** `<QueryProvider>`.
- Remove the inline `<script>` that reads `porto-theme` from `localStorage` in `layout.tsx`. Remove all `localStorage` reads/writes from `frontend/src/shared/ui/site-header.tsx`.

### 5b. Toggle button

Create `frontend/src/shared/ui/theme-toggle.tsx`:
- `'use client'`. Uses `useTheme()`.
- On click handler:
  ```ts
  const { clientX: x, clientY: y } = event;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const next = theme === 'dark' ? 'light' : 'dark';

  if (reduceMotion || !document.startViewTransition) {
    setTheme(next);
    return;
  }

  const transition = document.startViewTransition(() => setTheme(next));
  transition.ready.then(() => {
    document.documentElement.animate(
      [
        { clipPath: `circle(0% at ${x}px ${y}px)` },
        { clipPath: `circle(150% at ${x}px ${y}px)` },
      ],
      { duration: 500, easing: 'ease-in-out', pseudoElement: '::view-transition-new(root)' }
    );
  });
  ```
- Crossfade Lucide `Sun` ↔ `Moon` with `transition-opacity`. Show `Sun` in dark mode, `Moon` in light.
- Replace the current theme button in `frontend/src/shared/ui/site-header.tsx` with `<ThemeToggle />`.

---

## TASK 6 — SEO & PWA Infrastructure

All paths under `frontend/`.

### 6a. Static files

- `public/llms.txt`:
  ```
  # PORTO — Prasetya Adi Wijaya
  Site: https://porto.dev
  Owner: Prasetya Adi Wijaya
  Role: Design Engineer & Full Stack Developer
  Location: Banjar Baru, Kalimantan Selatan, Indonesia
  Stack: Next.js, React, TypeScript, Tailwind CSS, shadcn/ui
  Sections: Overview, Components, Projects, Writing, Partners, GitHub Contributions, Tech Stack, Awards, Certifications
  Contact: hello@porto.dev
  This file is provided for AI indexing purposes.
  ```
- `public/robots.txt`:
  ```
  User-agent: *
  Allow: /
  Disallow: /api/
  Sitemap: https://porto.dev/sitemap.xml
  ```
- `public/manifest.json`:
  ```json
  {
    "name": "PORTO — Prasetya Adi Wijaya",
    "short_name": "PORTO",
    "start_url": "/",
    "display": "standalone",
    "theme_color": "#171614",
    "background_color": "#171614",
    "description": "Design Engineer & Full Stack Developer portfolio",
    "icons": [
      { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
      { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
    ]
  }
  ```
- `public/icon-192.png`, `public/icon-512.png` — generate from existing `public/avatar.png`. `// TODO: replace with proper PWA icons`.

### 6b. Dynamic routes

- `src/app/sitemap.ts` — `MetadataRoute.Sitemap`. Static routes: `/`, `/#components`, `/#projects`, `/#writing`, `/#partners`. Dynamic blog slugs: empty array for now (`// TODO: enumerate when blog system lands`).
- `src/app/api/rss/route.ts` — `GET` returning `Content-Type: application/xml`. Render valid RSS 2.0 XML. Posts source: empty array for now (`// TODO: source from blog data when available`).

### 6c. Layout metadata

In `src/app/layout.tsx`:
- Replace current minimal `metadata` export with the full `Metadata` block from the spec (title, description, `openGraph`, `twitter`).
- Inject JSON-LD `Person` schema via `<script type="application/ld+json">` in the `<head>`. Pull `sameAs` URLs from `landing-content.ts` socials so they stay in sync rather than hardcoding.
- Reference `manifest.json`: add `manifest: '/manifest.json'` to `metadata`.

---

## Cross-Cutting Rules

- TypeScript only. No `any`. Use the existing path alias `@/*`.
- Every animation gated by `prefers-reduced-motion: reduce` — both CSS (`@media`) and JS (`window.matchMedia`).
- All interactive elements: keyboard accessible + visible `:focus-visible` ring (already present in PORTO's button defaults — verify per component).
- **No `localStorage` or `sessionStorage` anywhere.** React state / refs only.
- Always extend existing files; never overwrite.
- After each task, list: files created, files modified, TODOs requiring real data (tokens, audio, icons).
- Do not regress any existing section in `profile-sheet.tsx`.

---

## Verification

After each task, from `frontend/`:
```bash
pnpm lint
pnpm build
pnpm dev
```

Per-task smoke tests:

| # | Check |
|---|---|
| 2 | React Query Devtools panel visible in dev; `['github-contributions']` query appears once heatmap mounts. |
| 3 | `/api/github-contributions` returns `{ totalContributions, weeks }` JSON. With token unset, returns `{ 0, [] }` not 500. Heatmap renders skeleton then real data. |
| 4A | Clock ticks each second, matches `Asia/Makassar` (UTC+8). |
| 4B | Click copy on phone & email → check icon for 2s → revert. Clipboard contains the value. |
| 4C | Click pronounce → audio plays, bars animate, reverts on end. With audio missing → tooltip "Audio unavailable", no crash. |
| 4D | Scroll past 400px → button fades in; click → smooth scroll to top. Reduced-motion → no slide animation. |
| 5 | Toggle theme → circular clip-path expands from cursor (Chromium); instant swap on Firefox/Safari & reduced-motion. No `localStorage` writes (verify in DevTools → Application). |
| 6 | Visit `/sitemap.xml`, `/robots.txt`, `/manifest.json`, `/llms.txt`, `/api/rss`. View-source shows JSON-LD + complete OG/Twitter tags. Lighthouse PWA = installable. |

---

## Execution Order

Strict sequence — each task verified before the next starts.

`1 (audit) → 2 (Query setup) → 3 (Contributions API + hook) → 4A → 4B → 4C → 4D → 5 (Theme) → 6 (SEO/PWA)`.

---

## Relationship to `feature-parity.md`

| Concern | `feature-parity.md` | `backend-data-layer.md` (this) |
|---|---|---|
| GitHub heatmap | `unstable_cache` server fetch | TanStack Query + API route |
| Theme | `next-themes` | React state, no storage |
| Pronounce, Copy, Clock, Scroll | UX-focused (motion lib, hotkeys) | Data/state-focused (vanilla, no extra deps) |
| SEO/PWA | Sketched | Fully specified files |
| Command palette, glow cards, tech icons, animated icons | Owned by feature-parity | Out of scope here |

**Recommended execution**: run this plan **first** (gets data layer + SEO solid), then layer `feature-parity.md` on top for the polished UI affordances. If both have already been started, reconcile per the divergences listed in the Context section above.
