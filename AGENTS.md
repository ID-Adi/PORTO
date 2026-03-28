# Repository Guidelines

## Project Focus
PORTO adalah repository dokumentasi dan skill internal untuk membangun portfolio dengan aesthetic `minimalist technical / editorial`. Semua kontribusi harus konsisten dengan tiga sumber utama di [`docs/catatan1.md`](/home/adi/Documents/Development/PORTO/docs/catatan1.md), [`docs/detail_visual.md`](/home/adi/Documents/Development/PORTO/docs/detail_visual.md), dan [`docs/techstack.md`](/home/adi/Documents/Development/PORTO/docs/techstack.md).

## Project Structure & Module Organization
Gunakan [`docs/`](/home/adi/Documents/Development/PORTO/docs) sebagai knowledge base utama untuk tema visual, detail UI, dan keputusan stack. Simpan skill lokal di [`.agents/skills/`](/home/adi/Documents/Development/PORTO/.agents/skills); skill `porto-design-system` adalah acuan pertama untuk menjaga jawaban dan implementasi tetap selaras dengan docs.

Tambahkan dokumen baru berdasarkan topik, bukan tanggal. Gunakan nama file lowercase dengan underscore, misalnya `design_tokens.md`, `layout_rules.md`, atau `component_states.md`.

## Build, Test, and Development Commands
Belum ada build pipeline aplikasi di repo ini. Command kerja yang relevan saat ini:

- `ls docs .agents/skills` untuk memeriksa struktur konten dan skill lokal
- `rg '^#' docs` untuk meninjau hirarki heading Markdown
- `git diff -- docs .agents/skills AGENTS.md` untuk review perubahan sebelum commit

Jika project mulai masuk ke tahap implementasi, stack default yang harus diprioritaskan adalah Next.js, TypeScript, Tailwind CSS, shadcn/ui, Radix UI, Lucide, pnpm, dan Vercel.

## Coding Style & Naming Conventions
Tulis Markdown dengan heading yang rapi, bahasa langsung, dan isi yang bisa dipindai cepat. Hindari saran visual yang generic atau bertentangan dengan arah PORTO: monokrom, thin border, grid tegas, spacing disiplin, subtle pattern, dan motion yang tertahan.

Untuk skill, gunakan folder skill yang ringkas dengan `SKILL.md` sebagai sumber instruksi, lalu tambahkan `agents/openai.yaml` bila metadata UI dibutuhkan.

## Testing Guidelines
Karena belum ada test runner, validasi dilakukan secara manual. Periksa:

- konsistensi istilah antar dokumen dan skill
- kesesuaian rekomendasi dengan stack di `docs/techstack.md`
- konsistensi arah visual dengan `catatan1.md` dan `detail_visual.md`
- heading, path, dan contoh command tetap valid

Preview Markdown bila isi berubah cukup besar.

## Commit & Pull Request Guidelines
Gunakan commit subject imperatif dengan scope singkat, misalnya `docs: refine visual direction`, `skills: add porto design system`, atau `agents: add skill metadata`.

Pull request harus menjelaskan tujuan perubahan, file yang diubah, dan alasan desain atau stack bila ada keputusan baru. Tambahkan screenshot hanya jika tampilan render Markdown atau UI metadata memang perlu diperiksa.
