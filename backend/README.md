# Backend

Backend service untuk PORTO, berjalan terpisah dari Next.js frontend.

## Stack

- **Runtime**: Hono (lightweight web framework)
- **API**: tRPC (end-to-end typesafe)
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Better Auth
- **Validation**: Zod

## Setup

```bash
# 1. Start PostgreSQL
pnpm db:up

# 2. Install dependencies
pnpm install:backend

# 3. Generate & run migrations (setelah ada schema)
pnpm db:generate
pnpm db:migrate

# 4. Start dev server (port 4001)
pnpm dev:backend
```

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
└── auth/
    └── index.ts      # Better Auth config
```
