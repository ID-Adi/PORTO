# PORTO UI/UX Design System Skill

Skill ini adalah panduan lengkap sistem desain dan pola UI/UX yang digunakan di repo PORTO. Gunakan ini setiap kali mengembangkan fitur baru di `frontend/` agar tetap konsisten dengan gaya yang sudah ada.

---

## Filosofi Desain

**Tema: Minimalist Technical Editorial**

Karakter visual yang harus dipertahankan:
- Monokrom / low-saturation palette
- Grid-based layout dengan border sebagai struktur utama (bukan shadow/glassmorphism)
- Micro-texture halus (dots/hatch) untuk memberi depth tanpa keramaian
- Swiss-grid inspired — Vercel / shadcn-adjacent aesthetic
- Typographic hierarchy yang rapi: satu sans-serif modern + satu monospace

**Hindari:**
- Warna accent yang mencolok selain putih/hitam
- Shadow besar (box-shadow lebar dan gelap)
- Border-radius bulat (default `--radius: 0`)
- Gradient warna-warni
- Glassmorphism atau blur efek sebagai dekorasi utama

---

## 1. Sistem Warna (CSS Custom Properties)

Semua warna menggunakan variabel CSS di `frontend/src/app/globals.css`. **Jangan hardcode warna hex/rgb langsung** — selalu pakai variabel atau kelas Tailwind yang sudah dipetakan.

### Light Mode
```css
--background: oklch(1 0 0)           /* putih bersih */
--foreground: oklch(0.141 0.005 285.823) /* hampir hitam */
--card: oklch(1 0 0)
--muted: oklch(0.967 0.001 286.375)
--muted-foreground: oklch(0.552 0.016 285.938)
--border: oklch(0.92 0.004 286.32)
--line: color-mix(in oklab, var(--border) 64%, var(--background)) /* lebih lembut dari border */
--surface: oklch(0.985 0 0)
--texture-fg: rgba(24, 24, 27, 0.05) /* untuk dots/hatch pattern */
```

### Dark Mode (`.dark`)
```css
--background: oklch(0.141 0.005 285.823) /* hampir hitam */
--foreground: oklch(0.985 0 0)           /* hampir putih */
--card: oklch(0.21 0.006 285.885)
--muted: oklch(0.274 0.006 286.033)
--muted-foreground: oklch(0.705 0.015 286.067)
--border: oklch(0.274 0.006 286.033)
--line: color-mix(in oklab, var(--border) 64%, var(--background))
--surface: oklch(0.21 0.006 285.885)
--texture-fg: rgba(255, 255, 255, 0.05)
```

### Kelas Tailwind yang Valid
Gunakan: `text-foreground`, `text-muted-foreground`, `bg-background`, `bg-muted`, `bg-card`, `border-border`, `border-(--line)`, `bg-surface`

---

## 2. Tipografi

**Font System:**
```css
--font-sans: var(--font-geist-sans), "Inter", "Segoe UI", sans-serif  /* body & heading */
--font-mono: var(--font-geist-mono), "SFMono-Regular", "SF Mono", "Menlo", monospace  /* code, label, nav */
--font-pixel-square: var(--font-geist-pixel-square), ...  /* dekoratif khusus */
```

### Skala Tipografi
| Elemen | Size | Weight | Extras |
|---|---|---|---|
| Heading H1/display | `text-3xl` | `font-semibold` | `tracking-tight` |
| Section heading | `text-xl` / `text-2xl` | `font-medium` | `tracking-[-0.04em]` |
| Nav label | `text-[10px]` / `text-[11px]` | `font-medium` | `uppercase tracking-[0.08em] font-mono` |
| Body | `text-sm` | `font-normal` | `leading-7` |
| Muted/meta | `text-sm` | — | `text-muted-foreground` |
| Monospace label | `text-[11px]`/`text-xs` | `font-medium` | `font-mono` |

### Pattern Kicker (label kecil di atas heading)
```html
<p class="profile-kicker">EYEBROW TEXT</p>
```
CSS equivalent: `font-mono text-[10px] tracking-[0.12em] uppercase text-muted-foreground`

---

## 3. Layout System

### Container Utama
```html
<div class="page-frame">...</div>
```
CSS: `width: min(calc(100% - 16px), 768px); margin-inline: auto;`

Selalu bungkus konten halaman dalam `.page-frame` setelah `<main class="max-w-screen overflow-x-hidden px-2">`.

### Shell Halaman
```tsx
import { SiteShell } from "@/layout/site-shell";

export default function Page() {
  return (
    <SiteShell>
      <div className="page-frame *:[[id]]:scroll-mt-24">
        {/* konten */}
      </div>
    </SiteShell>
  );
}
```
`SiteShell` otomatis membungkus dengan `SiteHeader` + `SiteFooter`.

---

## 4. Panel System (Komponen Layout Modular)

Lokasi: `frontend/src/layout/panel.tsx`

Panel adalah blok section modular dengan border kiri-kanan dan garis horizontal.

```tsx
import {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelTitleSup,
  PanelDescription,
  PanelContent
} from "@/layout/panel";

<Panel id="section-id">
  <PanelHeader>
    <PanelTitle>
      Judul Section <PanelTitleSup>42</PanelTitleSup>
    </PanelTitle>
    <PanelDescription>Deskripsi singkat dalam mono text muted.</PanelDescription>
  </PanelHeader>
  <PanelContent>
    {/* konten */}
  </PanelContent>
</Panel>
```

| Komponen | Tag | Kelas Kunci |
|---|---|---|
| `Panel` | `<section>` | `screen-line-top screen-line-bottom border-x border-(--line)` |
| `PanelHeader` | `<header>` | `screen-line-bottom px-4` |
| `PanelTitle` | `<h2>` | `text-3xl font-semibold tracking-tight` |
| `PanelTitleSup` | `<sup>` | `-top-[0.75em] ml-1 text-sm font-medium text-muted-foreground` |
| `PanelDescription` | `<div>` | `py-4 font-mono text-sm text-balance text-muted-foreground` |
| `PanelContent` | `<div>` | `p-4` |

---

## 5. CSS Utility Classes Kustom (globals.css)

### Screen Lines — Garis Horizontal Full-Width
```html
<div class="screen-line-top">   <!-- garis di atas, meluas ke luar viewport -->
<div class="screen-line-bottom"> <!-- garis di bawah elemen -->
```
Dipakai untuk memisahkan section secara horizontal. Line meluas `200vw` sehingga menembus container.

### Surface Texture
```html
<div class="surface-dots">   <!-- dot pattern: radial-gradient titik halus 10x10px -->
<div class="surface-hatch">  <!-- diagonal hatch 315deg, opacity 0.95 -->
```
Gunakan untuk memberi depth pada card/hero section. Jangan overuse.

### Profile Components
```html
<p class="profile-kicker">LABEL ATAS</p>
<span class="profile-pill">pill tag</span>   <!-- full-radius, mono 11px -->
<span class="profile-chip">chip + icon</span>  <!-- serupa pill, support icon gap -->
<div class="profile-divider"></div>             <!-- 2rem divider dengan hatch bg -->
<div class="profile-mini-divider"></div>        <!-- 0.5rem divider tipis -->
<div class="profile-row">                      <!-- grid 2-col: 120px | 1fr -->
  <span>Label</span>
  <span>Value</span>
</div>
```

### Glow Card
```html
<div class="glow-card"><!-- radial gradient mengikuti pointer --></div>
```
Atau gunakan komponen React: `import { GlowCard } from "@/features/home/components/glow-card"`

---

## 6. Border & Divider Pattern

**Prinsip: border adalah fondasi struktur, bukan dekorasi.**

```html
<!-- Section dengan border kiri-kanan -->
<section class="border-x border-(--line)">

<!-- Dua kolom dengan divider tengah -->
<div class="grid md:grid-cols-2">
  <div class="border-r border-(--line) p-4">Left</div>
  <div class="p-4">Right</div>
</div>

<!-- Header section dengan border bawah -->
<div class="border-b border-(--line) px-4 py-3">
  <h2 class="text-sm font-medium">Title</h2>
</div>
```

**Gunakan `border-(--line)` bukan `border-border`** untuk border struktural — `--line` adalah campuran 64% border + 36% background, lebih lembut dan elegan.

**Corner marker (sudut dekoratif panel):**
```html
<div class="absolute top-[-3.5px] left-[-4.5px] size-2 border border-line bg-background" />
<div class="absolute top-[-3.5px] right-[-4.5px] size-2 border border-line bg-background" />
```

---

## 7. Komponen Interaktif

### ThemeToggle (dark/light)
```tsx
import { ThemeToggle } from "@/components/common/theme-toggle";
<ThemeToggle />
```
Toggle dengan animasi radial reveal 520ms via CSS clip-path.

### ElectricBorder (animasi border listrik — canvas)
```tsx
import ElectricBorder from "@/components/anim/electric-border";

<ElectricBorder color="#5227FF" speed={1} chaos={0.12} borderRadius={24}>
  <div>konten</div>
</ElectricBorder>
```
Props: `color` (hex), `speed` (multiplier), `chaos` (0-1 amplitude), `borderRadius` (px).
Gunakan sparingly — hanya untuk CTA atau hero element.

### CommandMenu (Search)
```tsx
import { openCommandMenu } from "@/components/common/command-menu";

<button onClick={() => openCommandMenu()}>Search</button>
```

### SectionTitle (heading dengan eyebrow)
```tsx
import { SectionTitle } from "@/components/common/section-title";

<SectionTitle
  eyebrow="CATEGORY"
  title="Judul Section Utama"
  description="Deskripsi singkat tentang section ini."
/>
```

### CopyButton
```tsx
import { CopyButton } from "@/components/common/copy-button";
<CopyButton value="teks yang akan dikopi" />
```

### Scroll Fade Effect
```html
<div class="scroll-fade-effect-y overflow-auto h-64">konten vertikal</div>
<div class="scroll-fade-effect-x overflow-auto">konten horizontal scroll</div>
```

---

## 8. Pola Navigasi

Header menggunakan dua level (lihat `frontend/src/layout/site-header.tsx`):
1. **Top bar** `h-12`: logo + quick links + theme toggle + search
2. **Rail nav** `h-8`: link section utama, `grid-cols-5` merata

Nav item active/inactive pattern:
```tsx
className={cn(
  "font-mono text-[10px] font-medium tracking-[0.08em] uppercase transition-[background-color,color]",
  isActive
    ? "bg-muted/60 text-foreground"
    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
)}
```

---

## 9. Pola Card

### Card Standar dengan Hatch Texture
```html
<div class="relative overflow-hidden border border-(--line) bg-card">
  <div class="surface-hatch absolute inset-0 pointer-events-none opacity-40"></div>
  <div class="relative p-4">
    <h3 class="text-sm font-medium">Judul</h3>
    <p class="mt-1 text-xs text-muted-foreground">Deskripsi</p>
  </div>
</div>
```

### Card dengan Dots
```html
<div class="surface-dots border border-(--line) bg-card p-4">
  konten
</div>
```

### GlowCard (hover radial glow)
```tsx
import { GlowCard } from "@/features/home/components/glow-card";

<GlowCard className="relative overflow-hidden border border-(--line) bg-card p-4">
  konten
</GlowCard>
```

---

## 10. Spacing & Rhythm

Skala spacing konsisten (base 4px Tailwind):

| Konteks | Nilai |
|---|---|
| Gap antar item dalam list | `gap-2` (8px), `gap-3` (12px) |
| Padding card/panel standar | `p-4` (16px) |
| Padding header section | `px-4 py-3` |
| Padding PanelDescription | `py-4` |
| Space-y dalam panel | `space-y-2.5` |
| Gap section | `gap-4`, `gap-6`, `gap-8` |

---

## 11. Aturan Radius

**Default: `--radius: 0` — semua elemen kotak/sharp.**

Pengecualian yang diperbolehkan:
- `.profile-pill` / `.profile-chip`: `border-radius: 999px` (penuh)
- `ElectricBorder`: sesuai kebutuhan per usage
- Scrollbar: `999px`
- Admin panel (`.admin-theme`): `--radius: 0.5rem` (scoped, jangan bocor ke portfolio)

---

## 12. Icon System

```tsx
import { Icons } from "@/layout/icons";
// Icons.gitHub, Icons.x, Icons.linkedIn, Icons.mail, dll.

import { Search, Home, Wrench, Frame } from "lucide-react"; // lucide untuk UI icons
```

Ukuran icon standar:
- `size-3.5` — nav/inline kecil
- `size-4` — body/button
- `size-5` — ilustrasi/header

---

## 13. Feature Architecture

Saat menambah fitur baru, ikuti struktur:
```
frontend/src/features/<domain>/
├── sections/     ← komponen section level halaman (diimpor di app/page.tsx)
├── components/   ← UI pieces spesifik domain
├── data/         ← typed static content (landing-content.ts, nav-items.ts)
└── types/        ← domain types
```

Routing: `app/page.tsx` → mengimpor dari `features/`.

| Lokasi | Isi |
|---|---|
| `components/ui/` | shadcn/ui primitives |
| `components/common/` | widget reusable lintas-feature |
| `components/anim/` | animasi canvas/CSS |
| `layout/` | shell, header, footer, panel, icons |
| `hooks/` | custom React hooks |
| `lib/` | pure helpers (cn, query-client, dll) |

---

## 14. Checklist Sebelum Commit Frontend

- [ ] Warna pakai variabel CSS / kelas Tailwind — tidak ada hardcode hex/rgb
- [ ] Border struktural pakai `border-(--line)`, bukan warna lain
- [ ] Font: heading → `font-sans`, label/code → `font-mono`
- [ ] Radius konsisten: `rounded-none` default, pill hanya untuk `.profile-pill`/`.profile-chip`
- [ ] Section dibungkus `Panel` atau minimal `screen-line-top screen-line-bottom`
- [ ] Komponen baru di folder yang benar sesuai Feature Architecture
- [ ] Dark mode diuji — `--texture-fg` dan semua warna bekerja di kedua mode
- [ ] Responsive: mobile-first, gunakan `sm:`, `md:` breakpoint
- [ ] Jalankan `pnpm lint:frontend` dan `pnpm build:frontend` sebelum commit

---

## 15. Referensi File Kunci

| File | Fungsi |
|---|---|
| `frontend/src/app/globals.css` | Semua CSS variable & utility kustom |
| `frontend/src/layout/panel.tsx` | Panel system — layout section modular |
| `frontend/src/layout/site-shell.tsx` | Shell halaman (header + main + footer) |
| `frontend/src/layout/site-header.tsx` | Header + dual-level nav pattern |
| `frontend/src/layout/site-footer.tsx` | Footer pattern |
| `frontend/src/components/anim/electric-border.tsx` | Canvas electric border animasi |
| `frontend/src/components/common/section-title.tsx` | Heading dengan eyebrow pattern |
| `frontend/src/features/home/components/glow-card.tsx` | Card dengan hover glow |
| `frontend/src/features/home/sections/profile-sheet.tsx` | Contoh implementasi panel penuh |
| `docs/detail_visual.md` | Referensi desain visual lengkap |
| `docs/catatan1.md` | Catatan tema dan karakter UI |
