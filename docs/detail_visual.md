# Detail Visual

-----

## Status Dokumen

Dokumen ini adalah catatan referensi implementasi visual yang dirapikan dari observasi terhadap web referensi:

https://chanhdai.com/

Isi dokumen ini diposisikan sebagai acuan pengkodean visual, bukan salinan literal dari source website. Fokusnya adalah menyaring pola desain, struktur layout, ritme visual, dan recipe CSS/Tailwind yang bisa diterapkan kembali dengan karakter serupa.

-----

## Tujuan Penggunaan

Gunakan catatan ini sebagai referensi saat:

membangun layout portfolio bertema technical editorial
menentukan sistem grid dan border
membuat pattern halus seperti dot texture atau diagonal hatch
menetapkan tipografi sans-serif modern yang rapi
menyusun palet warna dark yang sempit dan profesional

-----

## Ringkasan Gaya Utama

Secara keseluruhan, gaya visual dari referensi ini terasa seperti:

minimalist technical
editorial portfolio
Swiss-grid inspired
system-driven interface
Vercel / shadcn-adjacent aesthetic

Kekuatan utamanya ada pada:

grid yang tegas
border sebagai pembentuk struktur
tekstur mikro yang halus
warna monokrom gelap
tipografi modern yang hemat gaya

-----

## 1) Grid System

Gaya grid-nya bukan grid dekoratif penuh, tapi layout system yang dibangun dari garis vertikal + horizontal.
Jadi kesannya seperti editorial layout / technical blueprint.

-----

## Karakter Grid yang Dipakai

### a. Main Container Rapih dan "Boxed"

Dari inspeksi, area main lebarnya mengikuti viewport aktif saat ini dan punya padding kecil kanan-kiri:

main max-width: 924px
padding-inline: 8px

Artinya layout dibuat rapat ke sistem kolom, bukan full bebas.

-----

### b. Hampir Semua Section Dibingkai Border

Banyak section memakai pola class seperti:

border-x border-line
screen-line-top
screen-line-bottom

Ini bikin setiap blok terasa seperti panel modular.

Secara visual:

ada garis kiri-kanan konsisten
ada garis pemisah atas/bawah
semua section terasa masuk ke satu grid parent

-----

### c. Grid Dibangun dengan Divider, Bukan Background Grid Besar

Yang menarik: grid di sini bukan seperti graph paper besar di seluruh halaman.
Justru dibangun dari:

section wrapper
divider vertikal
divider horizontal
card yang ukurannya modular

Jadi "grid feel"-nya datang dari struktur, bukan ornamen.

-----

### d. Ritme Spacing Sangat Konsisten

Kesan minimalis-profesional muncul karena spacing-nya disiplin:

heading, paragraph, card, section pakai jarak yang seragam
tidak ada area yang "asal longgar"
kemungkinan besar mengikuti skala seperti 4 / 8 / 12 / 16 / 24 / 32 px

Ini penting, karena grid yang bagus bukan cuma garis, tapi juga rhythm spacing.

-----

## Kenapa Grid Ini Terasa Premium

Karena dia pakai prinsip:

alignment kuat
border tipis
spacing konsisten
komponen modular
content dense tapi tetap breathable

Ini sangat khas style:

Vercel
shadcn
dashboard/editorial design
Swiss-inspired digital layout

-----

## Arah Implementasi Grid

Kalau mau recreate grid system seperti ini, struktur Tailwind sederhananya kira-kira:

```html
<main class="mx-auto max-w-5xl px-2 md:px-4">
  <section class="border-x border-zinc-800">
    <div class="border-b border-zinc-800 px-4 py-3">
      <h2>Overview</h2>
    </div>
    <div class="grid md:grid-cols-2">
      <div class="border-r border-zinc-800 p-4">
        Left content
      </div>
      <div class="p-4">
        Right content
      </div>
    </div>
  </section>
</main>
```

Kalau mau rasa yang sama:

gunakan border-x hampir di semua section
tambah border-t atau border-b untuk ritme horizontal
pakai max-w yang tidak terlalu lebar
hindari full-width yang terlalu longgar

-----

## 2) Pattern "Arsir" di CSS

Bagian ini adalah salah satu elemen yang paling menentukan karakter visual referensi.
Dari observasi halaman, pattern utamanya terbagi menjadi dua:

dot pattern / titik halus
diagonal hatch / arsir diagonal

Pattern ini bukan dekorasi utama. Fungsinya adalah memberi micro-texture agar surface terasa hidup, engineered, dan premium.

-----

## A. Dot Pattern / Titik-Titik Halus

Dipakai sebagai tekstur latar halus di beberapa blok.

CSS yang terdeteksi secara konsep:

```css
background-image: radial-gradient(var(--pattern-foreground) 1px, transparent 0);
background-size: 10px 10px;
background-position: center;
```

Efek visualnya:

membentuk titik-titik kecil
sangat tipis
bukan untuk menarik perhatian, tapi memberi permukaan
bikin blok terasa lebih hidup tanpa kehilangan minimalism

Versi praktis:

```css
.pattern-dots {
  --pattern-foreground: rgba(255, 255, 255, 0.05);
  background-image: radial-gradient(var(--pattern-foreground) 1px, transparent 0);
  background-size: 10px 10px;
  background-position: center;
}
```

Untuk light mode, tinggal ganti warna titiknya jadi gelap transparan:

```css
.pattern-dots-light {
  --pattern-foreground: rgba(0, 0, 0, 0.05);
}
```

-----

## B. Diagonal Hatch / Arsir Diagonal

Ini kemungkinan pattern yang paling terasa sebagai "arsir dalam setiap div".

Di halaman referensi, pattern-nya muncul lewat `::before` pseudo-element dengan repeating gradient:

```css
background-image: repeating-linear-gradient(
  315deg,
  var(--pattern-foreground) 0,
  var(--pattern-foreground) 1px,
  transparent 0,
  transparent 50%
);
background-size: 6px 6px; /* atau 10px 10px */
```

Ada indikasi ukuran yang dipakai:

6px 6px
10px 10px

Kenapa terlihat elegan:

garisnya sangat tipis
opacity rendah
warna pattern mendekati warna border
dipakai sebagai overlay, bukan background utama

Jadi hasilnya terasa seperti:

technical shading
blueprint texture
subtle print texture

Contoh implementasi paling mirip:

```css
.pattern-hatch {
  position: relative;
}

.pattern-hatch::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
  background-image: repeating-linear-gradient(
    315deg,
    rgba(255, 255, 255, 0.08) 0,
    rgba(255, 255, 255, 0.08) 1px,
    transparent 0,
    transparent 50%
  );
  background-size: 8px 8px;
  opacity: 0.6;
}
```

Panduan mode warna:

Kalau dark mode: hatch putih transparan rendah
Kalau light mode: hatch hitam atau zinc transparan rendah

Kenapa pattern ini berhasil:

tidak dominan
cuma jadi micro-texture
dipadukan dengan border tipis
membuat div terasa punya material

Jadi bukan flat minimalism yang kosong, tapi textured minimalism.

-----

## 3) Font Pairing

Dari hasil inspeksi, font utamanya adalah:

GeistSans
fallback: "GeistSans Fallback"

Artinya, situs ini praktis memakai single sans-serif family untuk hampir semua elemen.

-----

## Detail Tipografi yang Terdeteksi

### H1

font-size: 30px
font-weight: 600
line-height: 36px
letter-spacing: -0.75px

Ini khas heading modern:

cukup padat
sedikit condensed secara optik
rapih dan techy

-----

### H2

font-size: 16px
font-weight: 500
line-height: 16px

-----

### Paragraph

font-size: 14px
font-weight: 400
line-height: 20px

-----

### Button

font-size: 14px
font-weight: 500

-----

## Kenapa Geist Cocok

Karena Geist punya karakter:

modern
neutral
bersih
sangat cocok untuk product UI, portfolio tech, dan design system

Dia tidak terlalu branding-heavy, jadi cocok untuk pendekatan sistematis seperti ini.

-----

## Pairing yang Terasa

Walau secara teknis yang terdeteksi cuma GeistSans, secara rasa pairing-nya seperti:

Display / heading: Geist SemiBold
Body / UI text: Geist Regular / Medium

Jadi pairing-nya bukan beda font family, tapi beda weight + hierarchy.

-----

## Arah Implementasi Tipografi

Kalau mau bikin style serupa:

Opsi 1, paling mirip:
Geist Sans untuk semuanya

Opsi 2, alternatif yang mendekati:
Inter
Sohne-style feel
SF Pro feel
General Sans
Manrope kalau mau sedikit lebih friendly

Prinsip tipografi yang bikin tampilannya terasa pro:

heading tidak terlalu besar
letter spacing heading sedikit negatif
body text kecil tapi readable
weight dipakai hemat
400 untuk isi
500 untuk label
600 untuk heading
warna teks dibedakan jelas
primary text
muted text
border text atau meta text

-----

## 4) Warna

Dari inspeksi, tema aktif saat ini adalah dark theme.

-----

## Variabel Warna yang Terdeteksi

Kurang lebih:

--background: sangat gelap, hampir hitam
--foreground: hampir putih
--muted: dark gray
--muted-foreground: gray lembut
--border: dark gray
--line: campuran border + background
--card: sedikit lebih terang dari background
--primary: hampir putih

-----

## Pembacaan Palet Secara Visual

Bisa diterjemahkan kira-kira ke palette berikut:

Background
hampir hitam
mirip zinc-950 / neutral-950

Foreground
putih lembut
bukan putih ekstrem tajam

Border / line
abu gelap tipis
cukup kontras untuk membentuk struktur
tidak terlalu terang supaya tetap subtle

Muted text
abu-abu dingin
cocok untuk metadata, caption, detail kecil

-----

## Approx Palette yang Bisa Dipakai

Versi Tailwind-ish:

```js
background:  zinc-950   // #09090b-ish
card:        zinc-900   // #111113-ish
foreground:  zinc-50    // #fafafa-ish
mutedText:   zinc-400   // #a1a1aa-ish
border:      zinc-800   // #27272a-ish
line:        zinc-800/70
accent:      white
```

Atau versi CSS:

```css
:root {
  --bg: #0a0a0b;
  --card: #111214;
  --fg: #f5f5f5;
  --muted-fg: #a1a1aa;
  --border: #27272a;
  --line: rgba(63, 63, 70, 0.7);
}
```

-----

## Kenapa Warna Ini Terasa Profesional

Karena:

paletnya sempit
tidak banyak aksen
fokus pada kontras struktur, bukan warna branding
tekstur dan garis jadi lebih menonjol

Dengan kata lain, hierarchy dibangun lewat tonal contrast, bukan warna-warni.

-----

## 5) Formula Desain yang Membuat Web Ini Enak Dilihat

Kalau diringkas, resep visualnya adalah:

Struktur
container sempit dan fokus
section modular
border kiri-kanan konsisten
divider horizontal rapih

Surface
background gelap
card sedikit lebih terang
pattern dots atau hatch sangat tipis
hampir tidak ada shadow besar

Type
satu sans-serif modern
ukuran heading moderat
body kecil tapi rapih
muted text untuk secondary info

Visual language
monokrom
engineered
editorial
design-system feel

-----

## 6) Tailwind/CSS Recipe untuk Meniru Style Ini

### Card dengan Arsir Diagonal

```html
<div class="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
  <div
    class="absolute inset-0 pointer-events-none opacity-50 [background-image:repeating-linear-gradient(315deg,rgba(255,255,255,0.06)_0,rgba(255,255,255,0.06)_1px,transparent_0,transparent_50%)] [background-size:8px_8px]"
  ></div>
  <div class="relative p-6">
    <h3 class="font-medium text-zinc-100">Title</h3>
    <p class="mt-2 text-sm text-zinc-400">Description</p>
  </div>
</div>
```

-----

### Card dengan Dot Texture

```html
<div
  class="border border-zinc-800 bg-zinc-950 [background-image:radial-gradient(rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:10px_10px]"
>
  ...
</div>
```

-----

### Section Wrapper ala Referensi

```html
<section class="border-x border-zinc-800">
  <div class="border-b border-zinc-800 px-4 py-3">
    <h2 class="text-sm font-medium text-zinc-100">Overview</h2>
  </div>
  <div class="px-4 py-5 text-sm text-zinc-400">
    Content...
  </div>
</section>
```

-----

## 7) Keyword Referensi Visual

Kalau mau eksplor style serupa di Dribbble, Awwwards, X, Pinterest, atau Figma Community, gunakan keyword:

Vercel inspired UI
shadcn aesthetic
Swiss grid web design
editorial portfolio website
technical minimalism UI
dark design system portfolio
monochrome product UI
grid based portfolio design

-----

## Catatan Penutup

Poin terpenting dari referensi `https://chanhdai.com/` bukan sekadar warna gelap atau border tipis, tetapi cara seluruh sistem visual dibangun dengan disiplin:

layout rapih
modul konsisten
tekstur halus
tipografi hemat
hierarki yang dibentuk oleh spacing, border, dan tonal contrast

Kalau dokumen ini dipakai untuk pengkodean, maka targetnya bukan menyalin bentuk secara mentah, tetapi membangun ulang karakter visualnya dengan sistem yang sama.
