# Tech Stack

-----

## Status Dokumen

Dokumen ini adalah versi rapi dari catatan pemilihan tech stack untuk membangun website dengan karakter visual seperti referensi `chanhdai.com`.

Fokus dokumen ini bukan hanya memilih tools, tetapi menjelaskan stack yang dipakai, alasan pemilihannya, urutan kerjanya, dan standar kualitas yang harus dijaga agar hasil akhirnya tetap konsisten, cepat, dan mudah dirawat.

-----

## Prinsip Utama

Jangan mulai dari mindset "membuat website", tapi mulai dari "membangun design system kecil".

Web seperti `chanhdai.com` terasa solid karena kemungkinan dibangun sebagai system, bukan kumpulan halaman yang berdiri sendiri.

Artinya, sebelum banyak ngoding, fondasi berikut harus sudah dipikirkan:

warna dasar
typography scale
spacing scale
border dan radius rules
grid dan container rules
component states
pattern dan decorative rules
dark dan light mode rules

Kalau fondasi ini tidak disiapkan dari awal, biasanya hasil akhirnya:

cepat jadi, tapi cepat berantakan
setiap section terasa beda style
sulit di-maintain
UI terasa seperti template campur-campur

-----

## Rekomendasi Stack Utama

Kalau targetnya adalah modern, stabil, cepat dikembangkan, dan punya komunitas besar, maka stack yang paling masuk akal adalah:

Frontend framework
Next.js

Language
TypeScript

Styling
Tailwind CSS

UI primitives
Radix UI

Component system
shadcn/ui

Animation
Motion atau Framer Motion

Icons
Lucide Icons

Design tool
Figma

Deployment
Vercel

-----

## Penjelasan Tiap Pilihan

### Next.js

Next.js adalah pilihan paling aman untuk web portfolio, company profile, landing page, atau situs content-heavy modern.

Alasannya:

SSR dan SSG matang
routing kuat
image optimization bawaan
ekosistem besar
banyak contoh implementasi nyata
cocok untuk performa dan SEO

-----

### TypeScript

TypeScript sebaiknya dianggap wajib kalau project ingin rapi dan scalable.

Keuntungannya:

membantu menjaga stabilitas saat UI makin kompleks
lebih aman saat refactor
mengurangi error karena kontrak data lebih jelas
cocok untuk project yang ingin maintainable

-----

### Tailwind CSS

Tailwind CSS cocok untuk style minimal-grid seperti referensi ini.

Keuntungannya:

sangat cepat untuk development
mudah menjaga consistency
cocok untuk membangun design system kecil
tidak perlu terlalu banyak file CSS terpisah
efisien untuk utility-driven styling

-----

### Radix UI

Radix UI dipakai untuk komponen interaktif yang perlu aksesibilitas dan perilaku yang stabil.

Contohnya:

dialog
dropdown
tooltip
tabs
accordion

Ini penting kalau UI terlihat sederhana, tapi perilaku UX-nya tetap harus kuat.

-----

### shadcn/ui

`shadcn/ui` bukan library kaku yang tinggal pakai. Ia lebih tepat dipakai sebagai starter system berbasis Radix UI dan Tailwind CSS.

Kenapa cocok:

bagus untuk web modern minimalis
mudah dikustomisasi total
struktur komponennya enak dijadikan fondasi design system internal
selaras dengan aesthetic Vercel / shadcn style yang ingin ditiru

-----

### Motion / Framer Motion

Gunakan hanya untuk animasi yang memang mendukung pengalaman pakai.

Pakai untuk:

microinteraction
reveal
hover state
marquee atau section movement ringan

Jangan dipakai berlebihan, karena style seperti ini justru kuat saat animasi terasa halus dan tertahan.

-----

### Lucide Icons

Lucide cocok untuk aesthetic minimalis tech karena:

clean
konsisten
modern
ringan

-----

### Figma

Figma dipakai untuk menyusun design system mini sebelum implementasi.

Yang perlu disiapkan lebih dulu di Figma:

Foundation
color tokens
typography tokens
spacing tokens
radius
border
shadows
grid

Components
button
input
card
navbar
section header
link styles
tabs
accordion
modal
badge
empty state
loading state

States
default
hover
focus
active
disabled
loading
error
success

Banyak project terlihat bagus di screenshot, tapi jelek saat dipakai karena state-nya tidak dirancang sejak awal.

-----

## Stack UI/UX yang Stabil

Stabil di sisi UI/UX bukan soal tools saja, tapi soal workflow.

Untuk project seperti ini, alur kerjanya harus memastikan:

ada foundation design token
ada aturan layout
ada komponen reusable
ada definisi state
ada behavior responsive

Kalau ini konsisten, UI akan terasa satu sistem. Kalau tidak, hasilnya mudah pecah saat skala halaman bertambah.

-----

## Strategi Performa

Untuk menjaga web tetap cepat, fokus ke empat area ini:

### A. Rendering Strategy

Dengan Next.js App Router:

gunakan Server Components untuk konten statis atau mostly static
gunakan Client Components hanya saat memang perlu interaksi

Kesalahan umum:

semua dijadikan client component
bundle jadi besar
hydration berat
web terasa lambat

-----

### B. Asset Strategy

Siapkan aturan dasar:

gambar gunakan WebP atau AVIF
icon gunakan SVG
font sebaiknya self-hosted atau di-optimize
jangan terlalu banyak video atau Lottie berat

-----

### C. CSS Strategy

Tailwind membantu karena:

styling cepat
bundle CSS bisa lebih efisien
struktur styling tetap terkendali

-----

### D. Performance Mindset

Penyebab web lambat biasanya:

animasi berlebihan
library terlalu banyak
image tidak di-optimize
terlalu banyak client-side state
fetch data tidak efisien
third-party scripts terlalu banyak

-----

## Developer Experience

Kalau targetnya cepat develop tapi tetap proper, setup yang disarankan:

Next.js
TypeScript
Tailwind CSS
shadcn/ui
Radix UI
Lucide
ESLint
Prettier
pnpm

Kenapa `pnpm`:

lebih cepat
hemat storage
dipakai luas di ekosistem modern
cocok untuk project modern

Optional yang bagus:

Storybook
bagus kalau komponen dibangun serius dan ingin diuji secara terpisah

Turborepo
berguna kalau project berkembang menjadi monorepo
tidak wajib kalau masih satu website

-----

## Rekomendasi Stack Final

Kalau harus memilih versi paling aman dan paling seimbang, gunakan:

Frontend
Next.js 15+
TypeScript
Tailwind CSS
shadcn/ui
Radix UI
Lucide
Motion atau Framer Motion

Quality tools
ESLint
Prettier
Husky
lint-staged

Deployment
Vercel

Design
Figma

Ini adalah kombinasi yang paling realistis untuk membangun website modern yang:

cepat
clean
maintainable
mudah dikembangkan

-----

## Yang Harus Disiapkan Sebelum Mulai Coding

### A. Design Tokens

Misalnya:

Colors
background
foreground
muted
muted-foreground
border
card
accent
success
warning
destructive

Typography
display
h1
h2
h3
body
small
caption

Spacing
4
8
12
16
20
24
32
40
48
64

Radius
sm
md
lg
xl

-----

### B. Layout Rules

Tentukan dari awal:

max width container
section spacing
grid columns
card padding
border style
divider style

Contoh rule:

container max-w 1200px
section vertical spacing 64-96px
card padding 16-24px
border 1px zinc
radius 12-16px

-----

### C. UI Components Minimal

Untuk website seperti ini, minimal siapkan:

Navbar
Section wrapper
Card
Button
Link
Badge
Social link item
Timeline item
Testimonial card
Project card
Blog card
Accordion
Command/search bar kalau perlu

-----

## Checklist Stabilitas UI/UX

Bagian ini sering dilupakan, padahal sangat penting.

### Accessibility

Pastikan:

kontras teks cukup
focus state jelas
keyboard navigation aman
heading hierarchy benar
aria-label untuk icon-only button
modal atau dialog accessible

Kalau ini gagal, web mungkin terlihat bagus tetapi UX-nya lemah.

-----

### Responsive Design

Siapkan behavior sejak awal untuk:

mobile
tablet
desktop
wide

Jangan desain desktop dulu lalu mobile dipaksa belakangan.

-----

### Empty, Loading, dan Error States

Web yang profesional harus siap untuk:

data kosong
image gagal load
loading skeleton
error fetch

-----

### Content Discipline

UI hanya akan stabil kalau model kontennya juga rapi.

Pastikan ada aturan untuk:

title max length
subtitle max length
card description limit
consistent metadata format

-----

## Kenapa Stack Ini Aman

Kombinasi berikut sangat aman dipilih:

Next.js
React
TypeScript
Tailwind CSS
shadcn/ui
Radix UI
Vercel
Figma

Alasannya:

dokumentasi banyak
tutorial banyak
open-source examples banyak
komunitas aktif di GitHub, X, Discord, dan YouTube
mudah cari solusi saat mentok

-----

## Urutan Kerja Paling Efisien

### Tahap 1 - Setup Fondasi

install Next.js + TypeScript + Tailwind CSS
pasang shadcn/ui
define color tokens
define typography
define container dan grid rules

-----

### Tahap 2 - Bangun Design Primitives

button
input
card
badge
section header
divider
link

-----

### Tahap 3 - Bangun Reusable Section

hero
about
project list
testimonial list
blog list
contact
footer

-----

### Tahap 4 - Polish

subtle pattern
border system
hover dan focus state
animation ringan
responsive pass

-----

### Tahap 5 - Optimize

image optimize
metadata
Open Graph
Lighthouse
accessibility audit

-----

## Style Ingredients yang Harus Ada

Kalau targetnya adalah aesthetic seperti `chanhdai.com`, siapkan:

Visual ingredients
monokrom atau zinc palette
Geist atau Inter style font
thin border
modular sections
dot atau hatch micro pattern
minimal shadow
rounded corners secukupnya
banyak whitespace
tight typography hierarchy

Technical ingredients
Tailwind utility classes
custom CSS kecil untuk pattern
tokens untuk warna dan line
reusable section wrapper

-----

## Saran Praktis

Jangan kebanyakan tools.

Kalau targetnya cepat tapi bagus, cukup mulai dari:

Next.js
TypeScript
Tailwind CSS
shadcn/ui
Radix UI
Lucide
Figma
Vercel

Stack itu sudah cukup untuk membuat web yang:

modern
clean
cepat
maintainable

-----

## Template Keputusan Stack

### Wajib

Next.js
TypeScript
Tailwind CSS
Figma

-----

### Sangat Direkomendasikan

shadcn/ui
Radix UI
Lucide
Vercel

-----

### Optional

Motion atau Framer Motion
Storybook
Turborepo
MDX kalau ada blog

-----

## Kesimpulan Singkat

Kalau ingin membangun project dengan karakter seperti referensi ini, maka yang harus disiapkan adalah:

Dari sisi design
design system mini
grid dan spacing rules
typography hierarchy
color tokens
component states

Dari sisi tech stack
Next.js + TypeScript + Tailwind CSS + shadcn/ui + Radix UI + Lucide + Vercel

Dari sisi kualitas
accessibility
responsive behavior
loading dan error states
performance optimization
content consistency

Dokumen ini sebaiknya dipakai sebagai panduan keputusan teknis sebelum implementasi dimulai, agar stack yang dipilih tetap fokus, tidak berlebihan, dan mendukung kualitas visual maupun performa secara bersamaan.
