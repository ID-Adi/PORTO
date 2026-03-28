# Run Frontend

Frontend sekarang berada di folder [`frontend/`](/home/adi/Documents/Development/PORTO/frontend) dan berjalan sebagai package mandiri di dalam repository monolith ini.

## Install Dependency

```bash
cd /home/adi/Documents/Development/PORTO/frontend
pnpm install
```

## Jalankan Development Server

```bash
cd /home/adi/Documents/Development/PORTO/frontend
pnpm dev
```

Frontend akan berjalan secara lokal dan bisa dibuka di alamat default Next.js, biasanya `http://localhost:3000`.

Alternatif dari root monolith:

```bash
cd /home/adi/Documents/Development/PORTO
pnpm install:frontend
pnpm dev:frontend
```

## Validasi Sebelum Lanjut Coding

```bash
cd /home/adi/Documents/Development/PORTO/frontend
pnpm lint
pnpm build
```

- `pnpm lint` untuk mengecek error linting
- `pnpm build` untuk memastikan App Router, TypeScript, dan styling build dengan benar

## Stack Saat Ini

- Next.js App Router
- React
- TypeScript
- Tailwind CSS v4
- shadcn/ui dengan style `radix-nova`
- Lucide React

## Struktur Penting

- `frontend/src/app` untuk routing dan layout
- `frontend/src/modules/home` untuk section homepage
- `frontend/src/components/ui` untuk komponen `shadcn/ui`
- `frontend/src/shared` untuk config, types, dan reusable helpers
- `backend/` disiapkan untuk layer backend ke depan
