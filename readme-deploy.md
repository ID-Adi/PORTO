# Deploy PORTO

Dokumen ini merangkum perintah deploy yang tersedia lewat `deploy.sh` di root repository.

## Prasyarat

Jalankan dari root repository:

```bash
cd /path/to/PORTO
```

Pastikan kebutuhan berikut sudah siap:

- Docker daemon berjalan.
- `docker compose` atau `docker-compose` tersedia.
- `docker-compose.yml` ada di root repository.
- `.env` root sudah diisi.
- `backend/.env` tersedia bila deploy backend.

Jika file belum executable:

```bash
chmod +x deploy.sh
```

## Bantuan

```bash
./deploy.sh --help
```

Menampilkan daftar flag yang didukung oleh script.

## Deploy Normal

```bash
./deploy.sh
```

Yang dilakukan:

- preflight Docker, Compose, dan env
- backup database sebelum backend disentuh
- fetch dan reset ke `origin/main`
- memastikan Postgres siap
- cek migrasi pending
- build dan restart backend
- build dan restart frontend
- cek health backend dan frontend
- tampilkan log serta status container

Script akan abort bila working tree kotor. Commit atau stash dulu, atau gunakan `--skip-pull` bila memang ingin deploy dari kode lokal.

## Deploy Frontend Saja

```bash
./deploy.sh --skip-backend
```

Yang dilewati:

- backup database
- start/check Postgres
- cek migrasi pending
- build/restart backend
- health check backend

Gunakan ini bila hanya ada perubahan frontend.

Jika `deploy.sh` atau file lain masih modified lokal dan belum di-commit, gunakan:

```bash
./deploy.sh --skip-backend --skip-pull
```

## Deploy Backend Saja

```bash
./deploy.sh --skip-frontend
```

Yang dilakukan:

- backup database bila container Postgres sudah berjalan
- pull kode terbaru
- memastikan Postgres siap
- cek migrasi pending
- build dan restart backend
- cek health backend

Frontend tidak akan dibuild atau direstart.

## Deploy Dari Kode Lokal

```bash
./deploy.sh --skip-pull
```

Gunakan bila ingin deploy ulang dari checkout saat ini tanpa `git fetch` dan tanpa `git reset --hard origin/main`.

Contoh frontend saja dari kode lokal:

```bash
./deploy.sh --skip-backend --skip-pull
```

Contoh backend saja dari kode lokal:

```bash
./deploy.sh --skip-frontend --skip-pull
```

## Skip Backup Database

```bash
./deploy.sh --no-backup
```

Melewati backup DB. Tidak disarankan untuk production, terutama bila backend atau migrasi ikut dideploy.

Catatan: backup DB otomatis dilewati bila memakai `--skip-backend`, karena backend dan migrasi tidak disentuh.

## Force Deploy

```bash
./deploy.sh --force
```

Memaksa script lanjut walaupun working tree kotor.

Hati-hati: saat `--force` dipakai bersama pull normal, script akan menjalankan reset ke `origin/main`. Perubahan lokal yang belum disimpan di commit/stash bisa hilang.

## Kombinasi Yang Tidak Valid

```bash
./deploy.sh --skip-backend --skip-frontend
```

Kombinasi ini ditolak karena tidak ada service yang akan dideploy.

## Ringkasan Command

| Kebutuhan | Command |
| --- | --- |
| Deploy normal | `./deploy.sh` |
| Lihat bantuan | `./deploy.sh --help` |
| Frontend saja | `./deploy.sh --skip-backend` |
| Backend saja | `./deploy.sh --skip-frontend` |
| Deploy kode lokal | `./deploy.sh --skip-pull` |
| Frontend saja dari kode lokal | `./deploy.sh --skip-backend --skip-pull` |
| Backend saja dari kode lokal | `./deploy.sh --skip-frontend --skip-pull` |
| Skip backup DB | `./deploy.sh --no-backup` |
| Paksa overwrite perubahan lokal | `./deploy.sh --force` |

## Backup Dan Rollback

Backup database disimpan di:

```bash
./backups/
```

Script menyimpan beberapa backup terakhir sesuai konfigurasi `BACKUP_RETENTION` di `deploy.sh`.

Jika deploy gagal, script akan menampilkan saran rollback kode dan restore database di output terminal. Ikuti command yang dicetak oleh script karena commit dan file backup-nya disesuaikan dengan deploy yang baru berjalan.

## Manual Fallback

Bila perlu menjalankan service secara manual tanpa script:

```bash
docker compose build frontend
docker compose up -d frontend
```

```bash
docker compose build backend
docker compose up -d backend
```

Jika server memakai Compose v1, ganti `docker compose` menjadi `docker-compose`.
