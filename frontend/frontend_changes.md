# Frontend Changes

Dokumen ini merangkum hal-hal yang sudah dikembangkan di folder `frontend/` untuk project PORTO.

## Ringkasan Arah Frontend

Frontend PORTO dibangun sebagai aplikasi Next.js dengan pendekatan:

- layout editorial boxed dengan frame utama `max-width: 768px`
- sistem border tipis dan rail vertikal yang konsisten
- tekstur visual halus seperti dot pattern dan hatch pattern
- struktur section modular agar mudah dikembangkan ke data dinamis / CRUD backend

## Struktur Frontend Saat Ini

Struktur utama yang sudah dipakai:

- `src/app/` untuk app router, layout global, dan stylesheet utama
- `src/modules/home/` untuk section halaman home / profile
- `src/shared/ui/` untuk shell layout dan primitive UI lintas halaman
- `src/components/ui/` untuk komponen UI dasar
- `src/components/anim/` untuk elemen animasi seperti electric border

## Yang Sudah Dikembangkan

### 1. Site Shell

File terkait:

- `src/shared/ui/site-shell.tsx`
- `src/shared/ui/site-header.tsx`
- `src/shared/ui/site-footer.tsx`
- `src/modules/home/components/floating-nav.tsx`

Yang sudah dibuat:

- shell utama halaman
- header sticky dengan navigasi utama
- footer sederhana dengan link eksternal
- floating nav untuk layar kecil
- container root yang sekarang menjadi anchor sistem rail dan grid global

### 2. Global Styling System

File terkait:

- `src/app/globals.css`

Yang sudah dibuat:

- token warna light dan dark
- variable layout seperti `--page-gutter` dan `--frame-width`
- utility texture seperti `surface-dots` dan `surface-hatch`
- frame boxed untuk area utama halaman
- rail vertikal global kiri dan kanan
- sistem garis horizontal hybrid yang mengikuti content nyata

### 3. Profile / Home Page Composition

File terkait:

- `src/app/page.tsx`
- `src/modules/home/sections/profile-sheet.tsx`
- `src/modules/home/data/landing-content.ts`
- `src/shared/types/content.ts`

Yang sudah dibuat:

- halaman utama memakai komposisi profile sheet
- data halaman dipisahkan dari render UI
- type content sudah didefinisikan untuk kebutuhan section dinamis
- susunan section modular seperti social links, about, testimonials, partners, stack, writing, awards, dan bookmarks

### 4. Profile Header dan Identity Block

File terkait:

- `src/modules/home/sections/profile-sheet.tsx`
- `public/avatar.png`
- `src/components/anim/electric-border.tsx`

Yang sudah dibuat:

- hero mark / monogram utama
- profile header dengan avatar, nama, status, dan deskripsi
- info overview dalam format row yang padat
- efek electric border pada avatar untuk interaksi visual

### 5. Sistem Grid dan Rail

File terkait:

- `src/shared/ui/content-rails.tsx`
- `src/shared/ui/site-shell.tsx`
- `src/app/globals.css`

Yang sudah dikembangkan:

- sebelumnya layout mengalami bug horizontal overflow
- penyebab utamanya berasal dari pseudo-element full-bleed yang memperlebar dokumen
- solusi awal menahan overflow tetapi belum menjaga ritme garis body dengan baik
- solusi terbaru memakai pendekatan hybrid:

  - rail vertikal global tetap dirender di shell
  - garis horizontal full-width dibaca dari posisi content nyata
  - garis horizontal sekarang mengikuti section dan row yang benar-benar dirender
  - pendekatan ini lebih cocok untuk future backend CRUD karena tidak bergantung pada tinggi statis

Hasil yang dituju:

- content tetap boxed
- sisi kiri dan kanan tetap memiliki struktur grid
- garis horizontal lebih selaras dengan body content
- scroll horizontal liar tidak muncul lagi

### 6. Primitive Content-Driven Lines

File terkait:

- `src/modules/home/sections/profile-sheet.tsx`
- `src/app/globals.css`

Yang sudah dibuat:

- marker seperti `profile-bleed-top` dan `profile-bleed-bottom`
- row list dan section heading sebagai anchor garis
- social rows dipecah per baris agar lebih mudah dipakai sebagai sumber alignment

Tujuannya:

- membuat sistem garis mengikuti struktur content
- menjaga agar perubahan data tidak merusak ritme layout

## Masalah yang Sudah Ditangani

### Overflow Horizontal

Masalah:

- halaman bisa di-scroll ke kanan pada desktop, tablet, dan mobile

Penyebab:

- pseudo-element full-bleed memakai teknik `100vw / 100dvw` di dalam frame sempit

Status:

- sudah diperbaiki

### Grid Samping Tidak Nyambung Dengan Content

Masalah:

- garis horizontal di sisi kiri dan kanan tidak terasa menyatu dengan body content

Penyebab:

- grid horizontal statis tidak mengikuti tinggi row / section nyata

Status:

- sedang diarahkan ke sistem hybrid berbasis content rails

## Validasi Yang Sudah Dilakukan

Validasi minimum yang sudah dijalankan:

- `pnpm --dir frontend lint`
- `pnpm --dir frontend build`

Catatan:

- build masih menampilkan warning `BETTER_AUTH_SECRET`, tetapi itu tidak terkait perubahan layout frontend

## Arah Pengembangan Berikutnya

Bagian yang masih bisa dilanjutkan:

- merapikan alignment rail pada section `About`
- memperluas anchor rail ke `Testimonials`, `Partners`, `Components`, dan `Writing`
- membuat primitive reusable untuk section row agar semua layout dinamis punya sistem garis yang sama
- menyiapkan struktur yang lebih siap dipakai saat content berasal dari backend CRUD

## Kesimpulan

Frontend PORTO saat ini sudah memiliki:

- shell layout utama
- profile sheet modular
- visual language editorial boxed
- texture dan border system
- fondasi grid/rail yang mulai diarahkan ke model content-driven

Fokus pengembangan terbaru adalah membuat grid horizontal sisi kiri dan kanan benar-benar mengikuti content nyata, tanpa mengorbankan boxed layout dan tanpa mengembalikan bug overflow horizontal.

Update terakhir: 7 April 2026, 20:27 WITA
