# Backend

Backend service untuk PORTO, berjalan terpisah dari Next.js frontend.

## Stack

- **Runtime**: Hono (lightweight web framework)
- **API**: tRPC (end-to-end typesafe)
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Better Auth
- **Validation**: Zod

## Prasyarat

- Docker Desktop (running)
- Node.js + pnpm 10
- Port `4002` (backend) & `5433` (Postgres) bebas

## Setup pertama kali

Jalankan dari **repo root** (`/Users/bravo/Documents/PORTO`).

### 1. Buat `backend/.env`

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` dan isi:

| Variable | Cara generate / nilai |
|---|---|
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `ADMIN_PASSWORD` | `openssl rand -base64 16 \| tr -d '/+=' \| head -c 20` (atau pilih sendiri) |
| `ADMIN_EMAIL` | default `admin@porto.dev`, bebas diganti |
| `DATABASE_URL` | default sudah cocok dengan `docker-compose.yml` |
| `BETTER_AUTH_URL` | default `http://localhost:4002` |
| `PORT` | default `4002` |

> ⚠️ `backend/.env` ter-gitignore — kredensial tetap aman, tidak akan ter-commit.

### 2. Start Postgres + install + migrate + seed

```bash
pnpm db:up                       # 1. Start Postgres (port 5433)
pnpm install:backend             # 2. Install dependencies (sekali)
pnpm db:generate                 # 3. Generate migration files dari schema
pnpm db:migrate                  # 4. Apply migration ke database
pnpm --dir backend db:seed:admin # 5. Seed admin user dari ADMIN_EMAIL/PASSWORD di .env
```

### 3. Run backend

```bash
pnpm dev:backend
```

Backend live di `http://localhost:4002`.

## Workflow harian

```bash
pnpm db:up           # start Postgres
pnpm dev:backend     # start backend
pnpm dev:frontend    # start frontend (terminal lain)
pnpm db:down         # stop Postgres saat selesai
```

| Tujuan | Command |
|---|---|
| Start DB | `pnpm db:up` |
| Stop DB | `pnpm db:down` |
| Run backend | `pnpm dev:backend` |
| Drizzle Studio (GUI DB) | `pnpm db:studio` |
| Generate migration baru setelah edit schema | `pnpm db:generate` |
| Apply migration | `pnpm db:migrate` |
| Re-seed admin | `pnpm --dir backend db:seed:admin` |

## Reset database

```bash
pnpm db:down
docker volume rm porto_postgres_data   # hapus data volume
pnpm db:up
pnpm db:migrate
pnpm --dir backend db:seed:admin
```

## Ganti admin password

1. Edit `ADMIN_PASSWORD` di `backend/.env`
2. Hapus user admin lama via `pnpm db:studio` (table `user`)
3. `pnpm --dir backend db:seed:admin`

## Konfigurasi default

| Service | Port | Catatan |
|---|---|---|
| Backend | `4002` | Hono + tRPC |
| Postgres | `5433` | dipetakan dari container 5432 untuk hindari konflik dengan Postgres lokal |
| DB name | `porto_db` | user `porto` / password `porto_secret` (dev only) |

## Structure

```
src/
├── index.ts          # Hono server entry point
├── db/
│   ├── index.ts      # Drizzle connection
│   ├── schema/       # Drizzle table schemas
│   └── migrations/   # Generated migrations
├── trpc/
│   ├── init.ts       # tRPC initialization
│   └── routers/      # tRPC routers
│       └── _app.ts   # Root router
├── auth/
│   └── index.ts      # Better Auth config
└── scripts/
    └── seed-admin.ts # Admin seeding script
```
