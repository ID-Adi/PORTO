# Frontend Architecture

## Chosen Direction

Project ini disiapkan sebagai monolith frontend: satu aplikasi utama di root repository, bukan multi-app atau monorepo. Pilihan ini paling cocok untuk tahap awal PORTO karena fokusnya masih membangun UI system, validasi visual, dan reusable section tanpa overhead workspace tambahan.

## Folder Strategy

Routing dan entry page ada di `src/app/`. Folder ini hanya bertugas untuk composition, layout global, dan route-level assembly.

Logika UI berbasis domain diletakkan di `src/modules/`. Setiap module menyimpan section, data dummy, dan kebutuhan spesifik domainnya sendiri. Untuk saat ini, `src/modules/home/` menjadi modul pertama untuk eksplorasi landing page.

Reusable primitive yang lintas module diletakkan di `src/shared/`, misalnya:

- `src/shared/ui/` untuk primitive seperti panel, section title, dan shell
- `src/shared/config/` untuk site-level config
- `src/shared/types/` untuk type bersama

## Architectural Rules

- `app/` boleh mengimpor dari `modules/` dan `shared/`
- `modules/` boleh mengimpor dari `shared/`
- `shared/` tidak boleh bergantung ke `modules/`
- dummy data tetap dekat dengan module sampai nanti ada CMS atau API layer

## Why This Fits PORTO

Struktur ini cocok dengan docs PORTO karena mendukung pendekatan “build the system before the pages”. Grid, border rhythm, subtle pattern, typography hierarchy, dan reusable section bisa diuji cepat tanpa membuat struktur file berantakan sejak awal.
