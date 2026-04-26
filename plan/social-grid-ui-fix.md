# Social Grid UI Fix — Plan

> Goal: Match the look of the **Social Links** grid section on the porto homepage with the reference implementation in `chanhdai.com/`.
> Scope: UI only — borders/lines, logo tile shape, hover state, link rel attribute. **No data or layout changes.**
> Status: Plan only. No code changes yet.

---

## 1. File map

### porto (target — to be modified)

| Role | Path |
|---|---|
| Section wrapper (grid + shared border overlay) | `frontend/src/features/home/sections/profile-sheet.tsx` → `SocialLinkRail` (lines 261–283) |
| Per-card `<a>` row | `frontend/src/features/home/sections/profile-sheet.tsx` → `SocialLinkItem` (lines 285–313) |
| Logo tile | `frontend/src/features/home/components/social-logo-tile.tsx` |
| CSS tokens | `frontend/src/app/globals.css` — `--line` (line 39, 77), `.screen-line-top/bottom` (lines 165–190), `--color-line` (line 429) |

### chanhdai (reference — read only)

| Role | Path |
|---|---|
| Section wrapper | `chanhdai.com/src/features/portfolio/components/social-links/index.tsx` |
| Per-card `<a>` row | `chanhdai.com/src/features/portfolio/components/social-links/social-link-item.tsx` |
| CSS tokens | `chanhdai.com/src/styles/globals.css` — `--line` (line 242), `screen-line-top/bottom` utilities (lines 133–139), `--accent-muted` (line 233) |

---

## 2. What's actually the same already

The grid + shared-line architecture is **already a direct port**. Both projects use:

- A `relative` container.
- An absolutely-positioned overlay grid (`grid grid-cols-2 gap-2 md:grid-cols-3`) of three empty `<div>` cells whose left/right borders draw the **vertical column dividers**.
- A second grid in the normal flow holding the actual `<a>` cards.
- `screen-line-top` / `screen-line-bottom` pseudo-elements on `:nth-child(2n+1)` (mobile, every odd cell) and `:nth-child(3n+1)` (md+, every leftmost cell of a row of 3) to draw **horizontal full-bleed dividers**.
- The same `--line` token, computed identically: `color-mix(in oklab, var(--border) 64%, var(--background))`.

So the line geometry, color formula, and border placement strategy are identical. The visible mismatch is **not** in border layout.

---

## 3. What's actually different

Four real diffs, ordered by visual impact.

### Diff 1 — Logo tile shape (BIGGEST visible mismatch) ★★★

`SocialLogoTile` in porto adds **corner-squircle / round** behavior that chanhdai does not have.

**porto** (`social-logo-tile.tsx` lines 12–24):

```tsx
<div className="relative size-8 shrink-0">
  <Image
    className="rounded-lg select-none corner-squircle supports-corner-shape:rounded-[50%]"
    ...
  />
  <div className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-black/10 corner-squircle ring-inset dark:ring-white/15 supports-corner-shape:rounded-[50%]" />
</div>
```

**chanhdai** (inlined inside `social-link-item.tsx` lines 21–32):

```tsx
<div className="relative size-8 shrink-0">
  <Image
    className="rounded-lg select-none"
    ...
  />
  <div className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-black/10 ring-inset dark:ring-white/15" />
</div>
```

Effect: in browsers that support the `corner-shape` CSS feature (recent Chrome/Safari), porto's tiles render as **full circles** (`rounded-[50%]`), while chanhdai's stay as **rounded squares** (`rounded-lg`). On a portfolio that mimics chanhdai, the round icons read as inconsistent with brand glyphs (e.g. X, GitHub, LinkedIn icons are designed for square tiles).

### Diff 2 — Hover background tint ★★

| | chanhdai | porto |
|---|---|---|
| Class | `hover:bg-accent-muted` | `hover:bg-muted/50` |
| Token | `--accent-muted` = `color-mix(in oklab, var(--accent) 50%, transparent)` (light) / `color-mix(in oklab, var(--accent) 20%, transparent)` (dark) | `--muted` (a neutral gray) at 50% alpha |
| Visual | Subtle accent-colored wash (slightly tinted) | Flat gray |

chanhdai's hover picks up the page accent color and feels alive. porto's hover is dead gray.

### Diff 3 — `rel` attribute ★

- chanhdai: `rel="noopener"`
- porto: `rel="noreferrer"`

Trivial, but for consistency with the reference and tracking parity, switch to `rel="noopener"`. (Note: chanhdai also runs the href through `addQueryParams(href, UTM_PARAMS)` for analytics — out of scope for this fix unless desired.)

### Diff 4 — Tailwind syntax for `--line` (no visual difference)

- chanhdai uses the token utility: `border-line`, `bg-line`.
- porto uses the arbitrary-property syntax: `border-(--line)`, `bg-(--line)`.

Both work because porto's `globals.css` line 429 declares `--color-line: var(--line)`, so `border-line` would resolve identically. Recommend converting for readability + parity, but this is cosmetic only — **no rendering change**.

There is **one** semantically-equivalent-but-stylistically-different selector in the overlay grid:

| chanhdai | porto |
|---|---|
| `<div className="border-l border-line max-md:hidden" />` | `<div className="hidden border-l border-(--line) md:block" />` |

Both hide the third overlay cell on mobile. No fix needed beyond the syntax cleanup above.

---

## 4. Diff/before-after to apply

### File A — `frontend/src/features/home/components/social-logo-tile.tsx`

```diff
-      <Image
-        className="rounded-lg select-none corner-squircle supports-corner-shape:rounded-[50%]"
+      <Image
+        className="rounded-lg select-none"
         src={src}
         alt={alt}
         width={32}
         height={32}
         quality={100}
         unoptimized
       />
-      <div className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-black/10 corner-squircle ring-inset dark:ring-white/15 supports-corner-shape:rounded-[50%]" />
+      <div className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-black/10 ring-inset dark:ring-white/15" />
```

(Removes `corner-squircle` and `supports-corner-shape:rounded-[50%]` from both the image and its ring overlay so tiles stay rounded squares everywhere.)

### File B — `frontend/src/features/home/sections/profile-sheet.tsx`

In `SocialLinkRail` (lines 261–283):

```diff
   <div className="pointer-events-none absolute inset-0 -z-1 grid grid-cols-2 gap-2 md:grid-cols-3">
-    <div className="border-r border-(--line)" />
-    <div className="border-l border-(--line) md:border-x" />
-    <div className="hidden border-l border-(--line) md:block" />
+    <div className="border-r border-line" />
+    <div className="border-l border-line md:border-x" />
+    <div className="border-l border-line max-md:hidden" />
   </div>
```

In `SocialLinkItem` (lines 285–313):

```diff
   <a
-    href={item.href}
+    href={item.href}
     target="_blank"
-    rel="noreferrer"
+    rel="noopener"
     className={cn(
-      "flex cursor-pointer items-center gap-4 p-4 pr-2 transition-[background-color] ease-out hover:bg-muted/50",
+      "flex cursor-pointer items-center gap-4 p-4 pr-2 transition-[background-color] ease-out hover:bg-accent-muted",
       "max-md:nth-[2n+1]:screen-line-top max-md:nth-[2n+1]:screen-line-bottom",
       "md:nth-[3n+1]:screen-line-top md:nth-[3n+1]:screen-line-bottom"
     )}
   >
```

Also need to change the trailing arrow color for consistency with chanhdai's syntax (no visual change):

```diff
-    <ArrowUpRight className="size-4 text-(--muted-foreground)" />
+    <ArrowUpRight className="size-4 text-muted-foreground" />
```

### File C — `frontend/src/app/globals.css` — verify only

Confirm that `--color-accent-muted` is declared in porto's globals so `hover:bg-accent-muted` resolves. If not present, add both light and dark token entries to mirror chanhdai's:

```css
/* light theme block */
--accent-muted: color-mix(in oklab, var(--accent) 50%, transparent);

/* dark theme block */
--accent-muted: color-mix(in oklab, var(--accent) 20%, transparent);

/* @theme inline block, alongside other --color-* mappings */
--color-accent-muted: var(--accent-muted);
```

Quick check command before editing:

```bash
grep -n "accent-muted\|--accent-muted\|--color-accent-muted" frontend/src/app/globals.css
```

If the grep returns nothing, **token must be added first** — otherwise `hover:bg-accent-muted` will be a no-op.

---

## 5. Implementation order

Do these in sequence; each step is independently verifiable in the browser.

1. **Pre-flight grep** — verify whether `--accent-muted` and `--color-accent-muted` are already in `frontend/src/app/globals.css`. If missing, add the three lines from File C above.
2. **File A** — strip `corner-squircle` + `supports-corner-shape:rounded-[50%]` from `social-logo-tile.tsx`. This is the highest-impact, lowest-risk change. Reload the homepage, confirm icons are now rounded squares (not circles).
3. **File B (hover)** — swap `hover:bg-muted/50` → `hover:bg-accent-muted` in `SocialLinkItem`. Hover a card; the background should pick up an accent tint.
4. **File B (rel)** — swap `rel="noreferrer"` → `rel="noopener"`.
5. **File B (Tailwind syntax cleanup)** — convert `border-(--line)` → `border-line`, `text-(--muted-foreground)` → `text-muted-foreground`, and align the third overlay column to `max-md:hidden`. Pixel-diff against the previous build to confirm zero visual delta.
6. **Visual QA** at three breakpoints: `≤md` (2-column), `md` (3-column), and dark mode for both. Specifically check:
   - Vertical column dividers continuous from top edge of the section to bottom edge.
   - Horizontal row dividers full-bleed (extending outside the panel via `screen-line-*`).
   - Logo tiles: rounded squares, not circles.
   - Hover: subtle accent wash, not flat gray.
   - Arrow icon color matches chanhdai (muted-foreground).
7. **Lint + build** — `pnpm lint:frontend && pnpm build:frontend` from repo root before committing.
8. **Commit** with message: `frontend: align social grid UI with chanhdai reference`.

---

## 6. Out of scope (explicitly not changing)

- Section data / order of social links (driven by `landing-content.ts`).
- The grid column counts (`2` on mobile, `3` on md+).
- Icon assets in `frontend/public/social-links/`.
- UTM tracking on links — chanhdai wraps href in `addQueryParams(href, UTM_PARAMS)`. Out of scope unless analytics parity is requested separately.
- Replacing `SocialLogoTile` with the inlined chanhdai pattern. Keeping the extracted component is fine; only its internal classes change.

---

## 7. Risk register

| Risk | Mitigation |
|---|---|
| `--accent-muted` not declared → hover becomes invisible | Pre-flight grep in step 1; add tokens if missing. |
| `border-line` Tailwind utility not generated | Verified `--color-line: var(--line)` exists in `globals.css` line 429 — utility will resolve. |
| Other components still rely on `corner-squircle` shape on logo tile | `SocialLogoTile` is only imported in `profile-sheet.tsx` (per `grep -r "SocialLogoTile" frontend/src` — verify before editing). If used elsewhere, extract a `roundness` prop instead of removing the class. |
| Browser cache shows old logo shapes | Hard reload during QA. |
