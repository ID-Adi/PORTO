# PORTO ↑ chanhdai.com Feature Parity Plan

## Context

PORTO is a minimalist Next.js 16 + React 19 + Tailwind v4 portfolio at `/Users/adi/Documents/Development/PORTO/frontend`. It has the editorial layout in place (hero, overview, contributions grid, testimonials, tech stack, scroll-to-top, theme toggle) but lacks the polished interactivity of the reference site at `/Users/adi/Documents/Development/PORTO/chanhdai.com` — no command palette, no audio pronounce, static clock, no copy buttons, mock heatmap data, flat testimonials, plain-text tech list, abrupt theme toggle, no SEO/PWA infra.

This plan upgrades PORTO to match chanhdai.com's interaction depth while preserving its monochrome editorial identity. Each task references the proven patterns at `chanhdai.com/src/...` so codex can mirror the implementation.

**Output destination for codex**: After approval, this file will be copied to `/Users/adi/Documents/Development/PORTO/plan/feature-parity.md`.

---

## Shared Setup (do once before TASK 1)

**Install dependencies** in `frontend/`:
```bash
pnpm add cmdk react-hotkeys-hook motion next-themes sonner @date-fns/tz date-fns web-haptics
```

**Add shadcn components**:
```bash
pnpm dlx shadcn@latest add command dialog tooltip
```

This pulls `command.tsx`, `dialog.tsx`, `tooltip.tsx` into `src/components/ui/`.

**Replace homegrown theme system with `next-themes`**:
- Delete the inline `<script>` in `frontend/src/app/layout.tsx` (lines ~21–30) and the `porto-theme` localStorage logic in `frontend/src/shared/ui/site-header.tsx`.
- Wrap `<body>` children in `<ThemeProvider attribute="class" defaultTheme="system" enableSystem>`.
- Re-wire `SiteHeader` toggle to `useTheme()`.

This unblocks TASK 1 (palette theme group) and TASK 9 (animated transition).

---

## TASK 1 — Command Palette (⌘K)

**Reference**: `chanhdai.com/src/components/command-menu.tsx` + `src/components/ui/command.tsx`.

**Files to create**:
- `frontend/src/shared/ui/command-menu.tsx` — client component using `<CommandDialog>`, `useHotkeys("mod+k, /")`, groups: Navigation, Components, Writing, Social, Theme.
- Wire into `frontend/src/shared/ui/site-header.tsx` lines 71–87 (replace placeholder search button onClick → `setOpen(true)`).
- Add `<CommandMenu />` mount in `frontend/src/app/layout.tsx` so it's globally available.

**Data source**: derive items from `frontend/src/modules/home/data/landing-content.ts` sections + a new `nav-items.ts` with section anchors. Use `<CommandShortcut>` to render hint badges. Trap focus is built into Radix `Dialog`.

---

## TASK 2 — Pronounce Name Button + Animated Soundwave

**Reference**: `chanhdai.com/src/features/portfolio/components/pronounce-my-name.tsx`, `src/components/animated-icons/volume.tsx`, `src/hooks/use-sound.ts`.

**Files**:
- Create `frontend/src/shared/hooks/use-sound.ts` — lazy-loads `HTMLAudioElement` on first hover, exposes `play()`, `isPlaying`.
- Create `frontend/src/shared/ui/animated-volume-icon.tsx` — three SVG bars with `motion/react` keyframe animation; ref exposes `startAnimation()` via `useImperativeHandle`.
- Replace existing pronounce button in `frontend/src/modules/home/components/profile-intro.tsx` (currently uses `speechSynthesis`) with new component pointing to `/audio/name-pronunciation.mp3`.
- Add `frontend/public/audio/.gitkeep` and `// TODO: replace with real recording` comment.
- Tooltip "Audio unavailable" on load error via `<Tooltip>`.
- Hotkey `"p"` triggers playback.

---

## TASK 3 — Live Local Clock (WITA, GMT+8)

**Reference**: `chanhdai.com/src/features/portfolio/components/overview/current-local-time-item.tsx`.

**File**: Create `frontend/src/modules/home/components/local-time.tsx` — client component, `useEffect` with `setInterval(updateTime, 1000)`. Use `@date-fns/tz` `TZDate` for `Asia/Makassar`. Format `HH:mm // GMT+8` with sub-label `WITA`.

**Wire**: Replace static time line in `landing-content.ts` overview entry with a render slot, or render the component directly in `frontend/src/modules/home/components/overview-item.tsx` when `item.kind === "time"`.

---

## TASK 4 — Copy-to-Clipboard for Phone & Email

**Reference**: `chanhdai.com/src/hooks/use-copy-to-clipboard.ts` + `src/components/copy-button.tsx`.

**Files**:
- Create `frontend/src/shared/hooks/use-copy-to-clipboard.ts` — state machine `idle | done | error`, 2000ms reset.
- Create `frontend/src/shared/ui/copy-button.tsx` — Lucide `Copy` ↔ `Check`, `aria-label` per instance.
- Update `frontend/src/modules/home/components/overview-item.tsx` to render a `<CopyButton>` next to the value when entry has `copyable: true`.
- Mark phone & email entries `copyable` in `landing-content.ts`.
- Mount `<Toaster />` (sonner) in root layout for confirmation toast.

---

## TASK 5 — Real GitHub Contributions Heatmap

**Reference**: `chanhdai.com/src/features/portfolio/data/github-contributions.ts` + `kibo-ui/contribution-graph` consumer.

**Files**:
- Create API route `frontend/src/app/api/github-contributions/route.ts` — server-only fetch to GitHub GraphQL `https://api.github.com/graphql` using `process.env.GITHUB_TOKEN`. Wrap in `unstable_cache` with 86400s revalidate. Returns `{ total, weeks: Activity[][] }`.
- Add `frontend/.env.example` entries: `GITHUB_TOKEN=`, `GITHUB_USERNAME=`.
- Create `frontend/src/modules/home/components/contribution-graph.tsx` — 52×7 grid, 5-level color scale via `data-level` attribute (existing CSS in `globals.css` `.contribution-cell` already handles this — keep and extend).
- Tooltip per cell: `"N contributions on Mon, Apr 22, 2024"` via `<Tooltip>`.
- Replace `GitHubContributionsSection` in `frontend/src/modules/home/sections/profile-sheet.tsx` to fetch via the route and pass real data; keep the mock generator as a server-side fallback when token is missing.
- Show `total` count above the grid.

---

## TASK 6 — Testimonials Wall (Glow Card)

**Reference**: `chanhdai.com/src/registry/components/glow-card-grid/glow-card.tsx` + `src/features/portfolio/components/testimonials.tsx`.

**Files**:
- Create `frontend/src/modules/home/components/glow-card.tsx` — tracks `mousemove` via `onPointerMove`, sets CSS custom props `--pointer-x` / `--pointer-y` (in `cqw`/`cqh` with container queries). Background uses `radial-gradient(circle at var(--pointer-x) var(--pointer-y), var(--color-glow), transparent 40%)`.
- Add CSS in `globals.css`: `.glow-card { container-type: inline-size; }` + glow gradient layer.
- Update `TestimonialsSection` in `profile-sheet.tsx` to use CSS grid with auto-rows for masonry feel; wrap each testimonial in `<GlowCard>`.
- Avatar fallback: render first letter in a 32×32 circle when no image set.
- IntersectionObserver fade-in: create `frontend/src/shared/hooks/use-in-view.ts`; apply staggered `transition-delay` per index.
- Expand testimonials in `landing-content.ts` to ≥6 entries (mark new ones with `// TODO: replace with real testimonial`).

---

## TASK 7 — Tech Stack Icon Grid

**Reference**: `chanhdai.com/src/features/portfolio/components/tech-stack.tsx`.

**Files**:
- Update `StackSection` in `frontend/src/modules/home/sections/profile-sheet.tsx` to render pills with `<Image src={`https://cdn.simpleicons.org/${slug}`} unoptimized width={16} height={16} />` + tech name + version.
- Add `slug` and optional `version` fields to stack entries in `landing-content.ts` (slugs: `nextdotjs`, `react`, `typescript`, `tailwindcss`, `shadcnui`, `radixui`, `lucide`, `playwright`, `vercel`).
- Configure `next.config.ts` `images.remotePatterns` to allow `cdn.simpleicons.org`.
- Tooltip wrapper showing full name + version on hover.
- Dark-mode invert: add CSS `.html.dark .tech-icon { filter: invert(1); }`.

---

## TASK 8 — Scroll-to-Top Button (upgrade existing)

**Reference**: `chanhdai.com/src/components/scroll-to-top.tsx`.

**File**: `frontend/src/shared/ui/scroll-to-top.tsx` — already exists, threshold 240px.

**Changes**:
- Bump threshold to 400px.
- Replace ad-hoc scroll listener with `motion/react` `useScroll()` + `useMotionValueEvent`.
- Add `data-scroll-direction` attribute (track previous scrollY); fade to 30% opacity when scrolling down, 100% on hover/up.
- Position `fixed bottom-6 right-6` with `env(safe-area-inset-*)`.
- Respect `prefers-reduced-motion` (skip animated transition).

---

## TASK 9 — Animated Theme Toggle (circular clip-path)

**Reference**: `chanhdai.com/src/components/theme-toggle.tsx`.

**File**: Create `frontend/src/shared/ui/theme-toggle.tsx`, mount in `site-header.tsx` (replacing current button).

**Implementation**:
- Use `useTheme()` from `next-themes`.
- On click: capture event coords, call `document.startViewTransition(() => setTheme(next))` if supported; inside the global `globals.css` add:
  ```css
  ::view-transition-new(root) { clip-path: circle(150% at var(--x) var(--y)); animation: clip-expand 500ms ease-out; }
  ::view-transition-old(root) { animation: none; }
  ```
  Set `--x` / `--y` from click coords on `document.documentElement` before triggering.
- Fallback if `startViewTransition` unsupported or `prefers-reduced-motion`: instant theme swap.
- Crossfade Lucide `Sun` ↔ `Moon` icons via Tailwind `transition-opacity` + `data-[state]` selectors.
- Hotkey `"d"` toggles theme.

---

## TASK 10 — SEO & PWA Infrastructure

**References**: `chanhdai.com/src/app/sitemap.ts`, `robots.ts`, `manifest.webmanifest`, `(llms)/llms-full.txt/route.ts`, `(app)/(docs)/blog/rss/route.ts`, `layout.tsx` JSON-LD + OG.

**Files to create in `frontend/`**:

| File | Purpose |
|---|---|
| `public/llms.txt` | Plain-text site description for AI scrapers |
| `public/robots.txt` | Allow all + sitemap pointer (or generate via `app/robots.ts`) |
| `public/manifest.json` | PWA manifest: name, short_name, start_url, display, theme_color, background_color, 192/512 icons |
| `app/sitemap.ts` | Next.js Metadata API sitemap with all static routes (+ blog slugs when added) |
| `app/robots.ts` | Optional dynamic robots — pick one of robots.txt or this |
| `app/api/rss/route.ts` | RSS 2.0 XML feed for blog posts (placeholder array for now) |
| `app/layout.tsx` | Add `<script type="application/ld+json">` with `Person` schema (name, url, sameAs, jobTitle, worksFor); expand `metadata` with full `openGraph` + `twitter` blocks |

**JSON-LD `sameAs`**: pull socials from `landing-content.ts` so it stays in sync.

**Icon placeholder**: `public/icon-192.png`, `public/icon-512.png` — generate from existing `public/avatar.png` (`// TODO: replace with proper PWA icons`).

---

## Cross-Cutting Rules (enforce per task)

- TypeScript everywhere; no `any`.
- Each new component: `'use client'` only when needed.
- Every animation gated by `@media (prefers-reduced-motion: reduce)`.
- Every interactive element has `:focus-visible` ring (already present in `globals.css` button defaults — verify).
- Keep editorial design tokens: monochrome surfaces, thin borders, no rounded radii (radius vars are 0px).
- No localStorage (use `next-themes` cookie/system; or in-memory state where the prompt explicitly forbids storage).

---

## Verification

After each task:

```bash
cd frontend
pnpm lint
pnpm build
pnpm dev
```

**Manual smoke checks** (375px + 1280px viewports):

1. Press ⌘K → palette opens → typing filters → Enter navigates → Esc closes.
2. Click pronounce → audio plays → bars animate → reverts on `ended`.
3. Clock updates each second; matches `Asia/Makassar`.
4. Click copy on phone/email → checkmark for ~2s → toast appears.
5. Heatmap renders 52 weeks; hover shows tooltip; total count present.
6. Hover testimonials → glow follows cursor; cards stagger in on scroll.
7. Tech stack chips show CDN icons; tooltip on hover; icons invert in dark mode.
8. Scroll past 400px → button fades in; click → smooth scroll to top.
9. Toggle theme → circular clip-path expands from cursor; instant when reduced-motion.
10. Visit `/sitemap.xml`, `/robots.txt`, `/manifest.json`, `/llms.txt`, `/api/rss`, view-source for JSON-LD + OG tags.

**Lighthouse pass** (target ≥ 95 on Performance, Accessibility, SEO, PWA installability).

---

## Execution Order

Strictly sequential. Do not start TASK N+1 until TASK N passes verification.

Shared Setup → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10.
