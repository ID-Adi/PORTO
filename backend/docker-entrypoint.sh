#!/bin/sh
set -e

echo "[entrypoint] Running database migrations..."
pnpm exec drizzle-kit migrate

echo "[entrypoint] Starting backend: $*"
exec "$@"
