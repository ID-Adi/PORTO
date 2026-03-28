---
name: porto-design-system
description: Gunakan skill ini saat bekerja pada project PORTO untuk merumuskan arah UI/UX, menjelaskan karakter visual, memilih stack implementasi, atau menghasilkan rekomendasi desain dan frontend yang harus konsisten dengan tiga dokumen utama di docs/.
---

# PORTO Design System

Skill ini menjadikan `docs/` sebagai sumber kebenaran untuk arah desain dan keputusan implementasi project PORTO.

## Kapan Dipakai

Gunakan skill ini saat user meminta:

- analisis tema visual atau identitas UI/UX PORTO
- penjelasan grid, border system, pattern, spacing, atau tipografi
- rekomendasi stack frontend untuk membangun aesthetic PORTO
- arahan implementasi section, komponen, atau design system kecil
- review apakah output desain atau frontend sudah selaras dengan referensi project

## Sumber Acuan

Baca file yang relevan sebelum memberi jawaban final:

- `docs/catatan1.md`: label tema, karakter visual, prinsip aesthetic, dan ringkasan gaya
- `docs/detail_visual.md`: detail grid system, pattern dot/hatch, tipografi, dan perilaku visual
- `docs/techstack.md`: stack utama, workflow, quality checklist, dan urutan implementasi

Jika permintaan mencakup arah visual sekaligus implementasi, baca ketiganya.

## Prinsip Inti Yang Harus Dijaga

- Aesthetic utama: minimalist technical / editorial portfolio
- Warna: monokrom atau low-saturation, jangan ramai
- Struktur: grid tegas, panel modular, thin borders, section rhythm konsisten
- Tekstur: subtle dot pattern atau diagonal hatch, hanya sebagai micro-texture
- Tipografi: hierarki kuat, whitespace tinggi, tampil clean dan engineered
- Motion: ringan, tertahan, dan hanya bila mendukung UX
- Implementasi default: Next.js, TypeScript, Tailwind CSS, shadcn/ui, Radix UI, Lucide, Vercel

## Workflow

1. Klasifikasikan dulu permintaan user: visual direction, visual detail, atau implementation guidance.
2. Baca hanya dokumen yang relevan dari `docs/`.
3. Jawaban harus spesifik ke PORTO, bukan saran UI generik.
4. Saat memberi arahan implementasi, prioritaskan design system kecil lebih dulu: tokens, layout rules, reusable primitives, lalu reusable sections.
5. Saat mereview hasil, cek konsistensi terhadap grid, border, whitespace, typography hierarchy, subtle pattern, accessibility, responsive behavior, dan performance mindset.

## Bentuk Output Yang Diutamakan

Sesuaikan jawaban dengan permintaan user, tetapi utamakan salah satu dari bentuk berikut:

- ringkasan arah desain yang singkat dan tegas
- checklist implementasi komponen atau section
- rekomendasi stack dan alasan pemilihan
- audit kesesuaian visual terhadap aesthetic PORTO
- aturan design tokens, layout rules, dan UI states

## Hindari

- saran visual yang terlalu colorful, glossy, atau dekoratif
- animasi berlebihan
- stack yang tidak perlu bila kebutuhan masih sederhana
- jawaban yang bertentangan dengan dokumen di `docs/`
