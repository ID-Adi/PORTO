# Backend Implementation Plan

## Status Ringkas

- [x] Scaffold workspace backend `@porto/backend`
- [x] Setup Drizzle + PostgreSQL config
- [x] Tambah route health check di Next.js
- [x] Tambahkan tabel auth dan user
- [x] Pasang Better Auth ke Next.js

- [ ] Generate dan jalankan migration auth/database
- [ ] Buat CRUD pertama yang benar-benar baca/tulis ke PostgreSQL
- [ ] Tambahkan validasi dan error handling
- [ ] Verifikasi akhir flow backend

## Checklist Progress

- [x] 1. Finalisasi Struktur Backend
- [x] 2. Tambahkan Tabel Auth dan User
- [x] 3. Pasang Better Auth ke Next.js
- [ ] 4. Generate dan Review Migration
- [ ] 5. Buat CRUD Pertama
- [ ] 6. Tambahkan Validasi dan Error Handling
- [ ] 7. Verifikasi Akhir

## Plan

### 1. Finalisasi Struktur Backend

Status: [x] selesai

Deskripsi singkat:
Menyiapkan `backend/` sebagai package workspace terpisah untuk schema, koneksi database, dan query agar tidak tercampur dengan folder `frontend/`.

### 2. Tambahkan Tabel Auth dan User

Status: [x] selesai

Deskripsi singkat:
Membuat tabel inti autentikasi yang dibutuhkan Better Auth seperti `user`, `session`, `account`, dan `verification`, lalu merapikan relasinya di schema Drizzle.

### 3. Pasang Better Auth ke Next.js

Status: [x] selesai

Deskripsi singkat:
Menambahkan konfigurasi Better Auth, adapter database, env yang diperlukan, dan route auth pada App Router Next.js.

### 4. Generate dan Review Migration

Status: [ ] belum dikerjakan

Deskripsi singkat:
Membuat migration Drizzle dari schema baru dan memastikan target database tidak bentrok dengan database lama seperti `erp`.

### 5. Buat CRUD Pertama

Status: [ ] belum dikerjakan

Deskripsi singkat:
Membuat route CRUD pertama untuk resource awal, kemungkinan `profile_entries`, agar aplikasi sudah bisa membaca dan menulis data nyata ke PostgreSQL.

### 6. Tambahkan Validasi dan Error Handling

Status: [ ] belum dikerjakan

Deskripsi singkat:
Menjaga payload request, response API, dan error database tetap konsisten dan aman.

### 7. Verifikasi Akhir

Status: [ ] belum dikerjakan

Deskripsi singkat:
Menjalankan lint, build, dan pengujian route penting untuk memastikan integrasi backend stabil.
