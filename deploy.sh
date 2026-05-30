#!/usr/bin/env bash
# Deploy PORTO dari main terbaru di origin — aman terhadap database.
#
# Yang dilakukan script ini:
#   1. Preflight: pastikan docker, compose, dan .env tersedia.
#   2. Backup database (pg_dump) SEBELUM menyentuh backend -> ./backups/.
#   3. Tarik kode terbaru dari origin/main (dengan proteksi working tree kotor).
#   4. Pastikan Postgres hidup & sehat lebih dulu.
#   5. Rebuild + restart backend (migrasi drizzle jalan otomatis via entrypoint).
#      Lewati dengan --skip-backend.
#   6. Rebuild + restart frontend (porto-frontend, dilayani via cloudflared-pawa
#      tunnel -> localhost:3001). Lewati dengan --skip-frontend.
#   7. Verifikasi kedua service sehat; kalau gagal, tampilkan log + cara rollback.
#
# Database container (porto-postgres) & volume postgres_data TIDAK PERNAH disentuh
# script ini — tidak ada `down`, tidak ada `-v`. Data aman lintas deploy.
#
# Usage:
#   ./deploy.sh                 # deploy normal (abort kalau working tree kotor)
#   ./deploy.sh --force         # paksa lanjut walau ada perubahan lokal (akan di-reset)
#   ./deploy.sh --no-backup     # skip backup DB (TIDAK disarankan)
#   ./deploy.sh --skip-pull     # deploy ulang dari kode yang sudah ada (tanpa git fetch/reset)
#   ./deploy.sh --skip-frontend # hanya redeploy backend, jangan sentuh frontend
#   ./deploy.sh --skip-backend  # hanya redeploy frontend, jangan sentuh backend

set -euo pipefail

cd "$(dirname "$0")"

# ──────────────────────────────────────────────────────────────────────────
# Konfigurasi
# ──────────────────────────────────────────────────────────────────────────
PG_SERVICE="postgres"            # nama service postgres di docker-compose.yml
BACKEND_SERVICE="backend"        # nama service backend
FRONTEND_SERVICE="frontend"      # nama service frontend
PG_CONTAINER="porto-postgres"    # container_name postgres
BACKEND_CONTAINER="porto-backend"
FRONTEND_CONTAINER="porto-frontend"
BACKUP_DIR="./backups"
BACKUP_RETENTION=10              # jumlah backup terakhir yang disimpan
HEALTH_RETRIES=30                # percobaan health check (x interval)
HEALTH_INTERVAL=3                # detik antar percobaan

FORCE=0
DO_BACKUP=1
DO_PULL=1
DO_BACKEND=1
DO_FRONTEND=1

for arg in "$@"; do
  case "$arg" in
    --force)         FORCE=1 ;;
    --no-backup)     DO_BACKUP=0 ;;
    --skip-pull)     DO_PULL=0 ;;
    --skip-backend)  DO_BACKEND=0 ;;
    --skip-frontend) DO_FRONTEND=0 ;;
    -h|--help)
      sed -n '2,24s/^# \{0,1\}//p' "$0"
      exit 0
      ;;
    *)
      echo "✗ Argumen tidak dikenal: $arg (pakai --help)" >&2
      exit 2
      ;;
  esac
done

if [ "$DO_BACKEND" -eq 0 ] && [ "$DO_FRONTEND" -eq 0 ]; then
  echo "✗ Tidak ada service untuk dideploy: --skip-backend dan --skip-frontend dipakai bersamaan." >&2
  exit 2
fi

# Warna (kalau output ke terminal)
if [ -t 1 ]; then
  C_OK=$'\033[32m'; C_WARN=$'\033[33m'; C_ERR=$'\033[31m'; C_DIM=$'\033[2m'; C_RST=$'\033[0m'
else
  C_OK=''; C_WARN=''; C_ERR=''; C_DIM=''; C_RST=''
fi
step() { echo "${C_DIM}▸${C_RST} $*"; }
ok()   { echo "${C_OK}✓${C_RST} $*"; }
warn() { echo "${C_WARN}!${C_RST} $*"; }
die()  { echo "${C_ERR}✗ $*${C_RST}" >&2; exit 1; }

# Laporkan migrasi yang belum diterapkan dengan membandingkan _journal.json
# (sumber kebenaran di repo) vs tabel drizzle.__drizzle_migrations di DB.
# Drizzle menerapkan migrasi yang `when` (folderMillis)-nya > MAX(created_at)
# yang sudah tercatat — logika yang sama kita pakai di sini.
report_pending_migrations() {
  local journal="backend/src/db/migrations/meta/_journal.json"
  [ -f "$journal" ] || { warn "Journal migrasi tidak ditemukan, lewati cek pending."; return 0; }

  # MAX(created_at) yang sudah diterapkan. Kalau schema/tabel belum ada
  # (DB fresh / deploy pertama), psql error -> anggap 0 (semua pending).
  local applied_max
  applied_max="$(docker exec "$PG_CONTAINER" psql -U "$PGUSER" -d "$PGDB" -tAc \
    "SELECT COALESCE(MAX(created_at),0) FROM drizzle.__drizzle_migrations;" 2>/dev/null | tr -d '[:space:]')"
  [ -z "$applied_max" ] && applied_max=0

  # Pasangan "<when>\t<tag>" tiap entri journal, urut sesuai file.
  local pending_count=0 pending_list=""
  while IFS=$'\t' read -r when tag; do
    [ -z "$when" ] && continue
    if [ "$when" -gt "$applied_max" ]; then
      pending_count=$((pending_count + 1))
      pending_list="${pending_list}    • ${tag}\n"
    fi
  done < <(awk -F'[:,]' '
      /"when"/ { gsub(/[" ]/,"",$2); w=$2 }
      /"tag"/  { gsub(/[" ]/,"",$2); print w"\t"$2 }
    ' "$journal")

  if [ "$pending_count" -eq 0 ]; then
    ok "Database sudah up-to-date — tidak ada migrasi pending."
  else
    warn "${pending_count} migrasi akan diterapkan saat backend start:"
    printf "%b" "$pending_list"
  fi
}

# Tunggu sebuah container jadi 'healthy' (atau 'running' bila tak punya
# healthcheck). Return 0 kalau sehat, 1 kalau gagal/timeout.
wait_healthy() {
  local container="$1" status
  for i in $(seq 1 "$HEALTH_RETRIES"); do
    status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container" 2>/dev/null || echo 'missing')"
    case "$status" in
      healthy) return 0 ;;
      # 'running' tanpa healthcheck: anggap ok setelah beberapa detik stabil.
      running) [ "$i" -ge 2 ] && return 0 ;;
      exited|dead|missing) return 1 ;;
    esac
    sleep "$HEALTH_INTERVAL"
  done
  return 1
}

# Pilih perintah compose yang tersedia (v2 plugin atau v1 standalone).
if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose"
else
  die "docker compose tidak ditemukan. Install Docker Compose dulu."
fi

# ──────────────────────────────────────────────────────────────────────────
# 1. Preflight
# ──────────────────────────────────────────────────────────────────────────
step "Preflight check..."
command -v docker >/dev/null 2>&1 || die "docker tidak terpasang."
docker info >/dev/null 2>&1 || die "Docker daemon tidak berjalan / tidak punya akses."
[ -f docker-compose.yml ] || die "docker-compose.yml tidak ada di $(pwd)."
[ -f .env ] || die ".env (root) tidak ada. Salin dari .env.example dan isi nilainya."
if [ "$DO_BACKEND" -eq 1 ]; then
  [ -f backend/.env ] || warn "backend/.env tidak ada — pastikan env backend sudah diset."
fi

# Muat kredensial Postgres dari .env root untuk keperluan pg_dump.
set -a
# shellcheck disable=SC1091
. ./.env
set +a
PGUSER="${POSTGRES_USER:-porto}"
PGDB="${POSTGRES_DB:-porto_db}"
ok "Preflight lolos (compose: ${DC})."

# ──────────────────────────────────────────────────────────────────────────
# 2. Backup database (sebelum menyentuh backend)
# ──────────────────────────────────────────────────────────────────────────
if [ "$DO_BACKEND" -eq 0 ]; then
  warn "Backup DB di-skip karena backend di-skip (--skip-backend)."
elif [ "$DO_BACKUP" -eq 1 ]; then
  if docker ps --format '{{.Names}}' | grep -qx "$PG_CONTAINER"; then
    step "Backup database sebelum deploy..."
    mkdir -p "$BACKUP_DIR"
    ts="$(date +%Y%m%d_%H%M%S)"
    backup_file="${BACKUP_DIR}/${PGDB}_${ts}.sql.gz"
    # pg_dump dari dalam container, kompres di host. Gagal = abort deploy.
    if docker exec "$PG_CONTAINER" pg_dump -U "$PGUSER" -d "$PGDB" --clean --if-exists \
         | gzip > "$backup_file"; then
      # Pastikan file tidak kosong.
      if [ -s "$backup_file" ]; then
        ok "Backup tersimpan: ${backup_file} ($(du -h "$backup_file" | cut -f1))"
      else
        rm -f "$backup_file"
        die "Backup kosong — abort. Periksa kredensial Postgres di .env."
      fi
    else
      rm -f "$backup_file"
      die "pg_dump gagal — abort deploy untuk melindungi data."
    fi
    # Retensi: simpan N backup terbaru saja.
    ls -1t "${BACKUP_DIR}/${PGDB}_"*.sql.gz 2>/dev/null | tail -n +$((BACKUP_RETENTION + 1)) | xargs -r rm -f
  else
    warn "Container ${PG_CONTAINER} belum jalan — lewati backup (kemungkinan deploy pertama)."
  fi
else
  warn "Backup DB di-skip (--no-backup)."
fi

# ──────────────────────────────────────────────────────────────────────────
# 3. Tarik kode terbaru
# ──────────────────────────────────────────────────────────────────────────
PREV_COMMIT="$(git rev-parse HEAD 2>/dev/null || echo 'unknown')"

if [ "$DO_PULL" -eq 1 ]; then
  # Proteksi: jangan reset --hard kalau ada perubahan lokal yang belum di-commit.
  if [ -n "$(git status --porcelain)" ] && [ "$FORCE" -ne 1 ]; then
    git status --short
    die "Working tree kotor. Commit/stash dulu, atau jalankan dengan --force untuk menimpa."
  fi
  step "Menarik main terbaru dari origin..."
  git fetch origin main
  git reset --hard origin/main
  NEW_COMMIT="$(git rev-parse HEAD)"
  if [ "$PREV_COMMIT" = "$NEW_COMMIT" ]; then
    ok "Sudah di commit terbaru (${NEW_COMMIT:0:8}) — tetap rebuild."
  else
    ok "Update: ${PREV_COMMIT:0:8} → ${NEW_COMMIT:0:8}"
  fi
else
  warn "Skip git pull (--skip-pull) — deploy dari kode lokal saat ini."
fi

# ──────────────────────────────────────────────────────────────────────────
# 4. Pastikan Postgres hidup & sehat lebih dulu
# ──────────────────────────────────────────────────────────────────────────
if [ "$DO_BACKEND" -eq 1 ]; then
  step "Memastikan Postgres hidup..."
  $DC up -d "$PG_SERVICE"
  # Tunggu healthcheck postgres lulus supaya migrasi backend tidak kena race.
  for i in $(seq 1 "$HEALTH_RETRIES"); do
    if docker exec "$PG_CONTAINER" pg_isready -U "$PGUSER" -d "$PGDB" >/dev/null 2>&1; then
      ok "Postgres siap."
      break
    fi
    [ "$i" -eq "$HEALTH_RETRIES" ] && die "Postgres tidak siap setelah $((HEALTH_RETRIES * HEALTH_INTERVAL))s."
    sleep "$HEALTH_INTERVAL"
  done

  # Tampilkan migrasi yang akan dijalankan (informasional) sebelum start backend.
  step "Cek migrasi pending..."
  report_pending_migrations
else
  warn "Backend di-skip (--skip-backend) — Postgres dan migrasi tidak disentuh."
fi

# ──────────────────────────────────────────────────────────────────────────
# 5. Rebuild + restart backend (migrasi drizzle jalan otomatis di entrypoint)
# ──────────────────────────────────────────────────────────────────────────
backend_ok=1
if [ "$DO_BACKEND" -eq 1 ]; then
  step "Build image backend..."
  $DC build "$BACKEND_SERVICE"

  step "Restart backend (migrasi DB jalan via entrypoint)..."
  $DC up -d "$BACKEND_SERVICE"

  # ──────────────────────────────────────────────────────────────────────────
  # 6. Verifikasi backend sehat
  # ──────────────────────────────────────────────────────────────────────────
  step "Menunggu backend sehat..."
  backend_ok=0
  if wait_healthy "$BACKEND_CONTAINER"; then backend_ok=1; fi
fi

# ──────────────────────────────────────────────────────────────────────────
# 7. Rebuild + restart frontend (Next.js standalone, origin tunnel localhost:3001)
# ──────────────────────────────────────────────────────────────────────────
# Build context = repo root; type-check butuh source backend (alias @porto/api).
frontend_ok=1
if [ "$DO_FRONTEND" -eq 1 ]; then
  step "Build image frontend..."
  $DC build "$FRONTEND_SERVICE"

  step "Restart frontend..."
  $DC up -d "$FRONTEND_SERVICE"

  step "Menunggu frontend sehat..."
  frontend_ok=0
  if wait_healthy "$FRONTEND_CONTAINER"; then frontend_ok=1; fi
else
  warn "Frontend di-skip (--skip-frontend)."
fi

# ──────────────────────────────────────────────────────────────────────────
# 8. Ringkasan + log
# ──────────────────────────────────────────────────────────────────────────
echo
if [ "$DO_BACKEND" -eq 1 ]; then
  step "Log backend terbaru:"
  $DC logs --tail=30 "$BACKEND_SERVICE" || true
fi
if [ "$DO_FRONTEND" -eq 1 ]; then
  echo
  step "Log frontend terbaru:"
  $DC logs --tail=30 "$FRONTEND_SERVICE" || true
fi
echo
step "Status container:"
$DC ps

echo
if [ "$DO_BACKEND" -eq 1 ]; then
  [ "$backend_ok" -eq 1 ] && ok "Backend sehat." || warn "Backend BELUM sehat (migrasi gagal? env salah?)."
else
  warn "Backend di-skip (--skip-backend)."
fi
if [ "$DO_FRONTEND" -eq 1 ]; then
  [ "$frontend_ok" -eq 1 ] && ok "Frontend sehat." || warn "Frontend BELUM sehat (build/env gagal?)."
fi

if [ "$backend_ok" -eq 1 ] && [ "$frontend_ok" -eq 1 ]; then
  echo
  ok "Deploy selesai di commit $(git rev-parse --short HEAD)."
  [ "$DO_BACKUP" -eq 1 ] && echo "${C_DIM}  Backup DB: ${backup_file:-<dilewati>}${C_RST}"
else
  echo
  warn "Ada service yang belum sehat — cek log di atas untuk penyebabnya."
  rollback_services=""
  [ "$DO_BACKEND" -eq 1 ] && rollback_services="${rollback_services} ${BACKEND_SERVICE}"
  [ "$DO_FRONTEND" -eq 1 ] && rollback_services="${rollback_services} ${FRONTEND_SERVICE}"
  echo "  Rollback kode:     git reset --hard ${PREV_COMMIT} && ${DC} up -d --build${rollback_services}"
  if [ "$DO_BACKUP" -eq 1 ] && [ -n "${backup_file:-}" ]; then
    echo "  Restore database:  gunzip -c ${backup_file} | docker exec -i ${PG_CONTAINER} psql -U ${PGUSER} -d ${PGDB}"
  fi
  exit 1
fi
