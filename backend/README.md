# Backend

Folder ini disiapkan sebagai boundary backend di dalam monolith PORTO.

Sekarang backend sudah disiapkan sebagai package workspace `@porto/backend` untuk persistence dan integration logic yang dipakai frontend Next.js.

Yang ada saat ini:

- `src/db/schema.ts` sebagai barrel schema Drizzle
- `src/db/profile-schema.ts` untuk schema domain project
- `src/db/auth-schema.ts` untuk schema auth
- `src/db/client.ts` untuk koneksi PostgreSQL
- `src/db/queries.ts` untuk query helper yang aman dipanggil dari app
- `drizzle.config.ts` untuk migration dan studio

Command dasar:

- `pnpm install`
- `pnpm db:generate`
- `pnpm db:migrate`
- `pnpm db:studio`

Salin `backend/.env.example` lalu isi `DATABASE_URL` sebelum menjalankan command Drizzle atau route yang butuh database.
