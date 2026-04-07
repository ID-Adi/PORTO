# Google OAuth Setup

## Tujuan

Dokumen ini menjelaskan langkah lengkap untuk menyalakan login Google pada setup Better Auth + Next.js + PostgreSQL di project PORTO.

## Env yang Dibutuhkan

Isi variabel berikut di `frontend/.env.local`:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/porto
BETTER_AUTH_SECRET=replace-with-a-long-random-secret
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

Untuk command Drizzle di folder `backend/`, isi juga `backend/.env`:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/porto
```

## Langkah di Google Cloud Console

1. Buka `Google Cloud Console`.
2. Buat project baru atau pilih project yang akan dipakai.
3. Buka `APIs & Services`.
4. Masuk ke `OAuth consent screen`.
5. Pilih user type yang sesuai.
6. Isi nama aplikasi, email support, dan data dasar aplikasi.
7. Tambahkan scope dasar yang diperlukan.
8. Tambahkan test users jika app masih mode testing.
9. Simpan konfigurasi consent screen.
10. Buka `Credentials`.
11. Klik `Create Credentials`.
12. Pilih `OAuth client ID`.
13. Pilih tipe `Web application`.
14. Isi nama credential.
15. Tambahkan `Authorized JavaScript origins`:
    - `http://localhost:3000`
16. Tambahkan `Authorized redirect URIs`:
    - `http://localhost:3000/api/auth/callback/google`
17. Jika nanti deploy production, tambahkan juga:
    - `https://your-domain.com`
    - `https://your-domain.com/api/auth/callback/google`
18. Simpan lalu copy `Client ID` dan `Client Secret`.

## Langkah di Project PORTO

1. Isi `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET` di `frontend/.env.local`.
2. Isi `BETTER_AUTH_SECRET` dengan secret acak yang panjang.
3. Pastikan `BETTER_AUTH_URL` cocok dengan origin aplikasi.
4. Pastikan `DATABASE_URL` mengarah ke database PORTO, bukan database `erp`.
5. Jalankan install dependency:

```bash
pnpm install
```

6. Generate schema auth jika ada perubahan config auth:

```bash
pnpm --dir frontend exec npx @better-auth/cli@latest generate --config src/lib/auth.ts --output ../backend/src/db/auth-schema.ts
```

7. Generate migration Drizzle:

```bash
pnpm db:generate
```

8. Jalankan migration ke database PORTO:

```bash
pnpm db:migrate
```

9. Jalankan frontend:

```bash
pnpm dev:frontend
```

## Callback URL yang Harus Cocok

Untuk local development:

```text
http://localhost:3000/api/auth/callback/google
```

Untuk production:

```text
https://your-domain.com/api/auth/callback/google
```

Kalau URL ini tidak sama persis dengan config Google Cloud, login Google akan gagal.

## Checklist Verifikasi

- `GOOGLE_CLIENT_ID` sudah terisi
- `GOOGLE_CLIENT_SECRET` sudah terisi
- `BETTER_AUTH_SECRET` sudah terisi
- `BETTER_AUTH_URL` sesuai origin app
- `DATABASE_URL` sudah mengarah ke database PORTO
- redirect URI Google sudah sama persis
- migration auth sudah dijalankan
- route `/api/auth/[...all]` sudah aktif

## Status Saat Ini

Sudah disiapkan di codebase:

- config Better Auth
- route handler auth Next.js
- env example untuk frontend

Masih perlu dijalankan:

- generate schema auth final
- migration database
- pengisian kredensial Google asli
