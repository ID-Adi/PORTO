# Frontend Architecture

## Chosen Direction

Project ini sekarang disiapkan sebagai monolith repository dengan boundary aplikasi yang jelas. Frontend berada di folder `frontend/` sebagai package mandiri, sedangkan `backend/` disiapkan sebagai boundary terpisah untuk layer API atau service di tahap berikutnya. Pendekatan ini tetap ringan, tetapi lebih siap untuk pertumbuhan dibanding menaruh seluruh aplikasi langsung di root.

## Folder Strategy

Routing dan entry page frontend ada di `frontend/src/app/`. Folder ini hanya bertugas untuk composition, layout global, dan route-level assembly.

Logika UI berbasis domain diletakkan di `frontend/src/modules/`. Setiap module menyimpan section, data dummy, dan kebutuhan spesifik domainnya sendiri. Untuk saat ini, `frontend/src/modules/home/` menjadi modul pertama untuk eksplorasi landing page.

Reusable primitive yang lintas module diletakkan di `frontend/src/shared/`, misalnya:

- `frontend/src/shared/ui/` untuk primitive seperti panel, section title, dan shell
- `frontend/src/shared/config/` untuk site-level config
- `frontend/src/shared/types/` untuk type bersama

Komponen `shadcn/ui` berada di `frontend/src/components/ui/`, terpisah dari `shared/` karena ia berperan sebagai UI library source yang bisa dikomposisikan lintas module.

## Architectural Rules

- `app/` boleh mengimpor dari `modules/` dan `shared/`
- `modules/` boleh mengimpor dari `shared/`
- `shared/` tidak boleh bergantung ke `modules/`
- dummy data tetap dekat dengan module sampai nanti ada CMS atau API layer
- backend tidak boleh dicampur ke folder frontend; service, API contract, atau persistence layer nantinya harus masuk ke `backend/`

## Why This Fits PORTO

Struktur ini cocok dengan docs PORTO karena mendukung pendekatan “build the system before the pages”, sambil tetap memberi boundary monolith yang bersih antara UI application dan backend domain. Grid, border rhythm, subtle pattern, typography hierarchy, dan reusable section bisa diuji cepat tanpa membuat struktur file berantakan sejak awal.
