#!/usr/bin/env bash
# Deploy PORTO backend from latest main on origin.
# Usage: ./deploy.sh
set -euo pipefail

cd "$(dirname "$0")"

echo "▸ Pulling latest main..."
git fetch origin main
git reset --hard origin/main

echo "▸ Rebuilding backend..."
docker compose up -d --build backend

echo "▸ Waiting for backend to settle..."
sleep 3

echo "▸ Recent logs:"
docker compose logs --tail=30 backend

echo "▸ Container status:"
docker compose ps backend

echo "✓ Deploy complete."
