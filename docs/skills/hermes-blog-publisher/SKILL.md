---
name: porto-blog-publisher
description: "Publish blog content to PORTO (pawa.my.id) via existing MCP tools (blog_propose_create etc). All writes are PROPOSALS pending admin approval at /admin/mcp — never direct publish. Use when asked to post, draft, or publish an article to the PORTO blog."
version: 1.0.0
tags: [porto, blog, mcp, publishing, content]

triggers:
  - "Publishing or drafting an article to the PORTO blog (pawa.my.id)"
  - "Sending synthesized/researched content to the blog backend"
  - "Submitting daily saham/crypto market reports as blog posts"
  - "Questions about blog categories, slugs, tags (meta), or the approval flow"
---

# PORTO Blog Publisher

Skill ini mendeskripsikan cara mengirim artikel ke blog PORTO (pawa.my.id) melalui
MCP bridge backend. **Jangan menulis kode backend baru dan jangan menyimulasikan
publish lewat chat** — backend sudah menyediakan tool MCP lengkap untuk seluruh
alur. Tugasmu hanya memanggil tool dengan payload yang benar.

## Koneksi

**Selalu gunakan API production** — semua aksi blog menarget backend production
(`api.pawa.my.id`), jangan pernah menarget localhost/dev server.

MCP server `porto-agent` sudah terkonfigurasi di `config.yaml` (wrapper
`porto-mcp@latest`, auth via env `PORTO_MCP_TOKEN`/`PORTO_MCP_ENDPOINT`,
endpoint-nya production). **Panggil tool-nya langsung sebagai tool MCP native**
— jangan curl/HTTP manual.

Fallback jika server `porto-agent` tidak tersedia: JSON-RPC langsung ke API
production `https://api.pawa.my.id/api/mcp` dengan header
`Authorization: Bearer porto_mcp_<token>`.

## Prinsip utama: propose → approve, BUKAN publish langsung

Backend PORTO sengaja tidak mengizinkan agent eksternal publish langsung.
Setiap aksi tulis masuk antrean `mcpActionRequests` dan baru dieksekusi setelah
admin approve di dashboard `/admin/mcp`. Konsekuensinya:

1. `blog_propose_create` selalu membuat post dengan `published: false`.
2. Publish adalah proposal terpisah (`blog_propose_publish`) yang juga menunggu approval.
3. Setelah memanggil tool, laporkan ke user: **"proposal terkirim (requestId N),
   menunggu approval di /admin/mcp"** — jangan pernah mengklaim artikel sudah tayang.

## Tools

### `blog_prepare_draft` (read-only, opsional)
Helper untuk menyusun kerangka draft. Tidak menyentuh database.

```json
{ "title": "string (wajib)", "brief": "string (wajib)", "tone": "string (opsional)" }
```

Mengembalikan `{ title, slug, description, meta, content, tone }` yang bisa
kamu kembangkan sebelum diajukan.

### `blog_propose_create` (jalur utama artikel baru)

```json
{
  "title": "string, wajib",
  "slug": "string, wajib — lowercase, alfanumerik + dash, maks 120 char",
  "description": "string|null — ringkasan ±180 char untuk listing/SEO",
  "content": "string|null — markdown lengkap, mulai dengan '# {title}'",
  "meta": "string|null — tag dipisah koma, TANPA hashtag",
  "category": "\"global\" | \"saham_crypto\" | \"learning\"",
  "coverUrl": "string|null — opsional"
}
```

Aturan field:
- `category` ketat tiga nilai itu. `global` = artikel editorial/teknis,
  `saham_crypto` = laporan pasar harian, `learning` = catatan belajar/riset.
  (Alias legacy `study` masih diterima dan dipetakan ke `learning`, tapi
  jangan dipakai untuk konten baru.)
- `meta` adalah daftar tag dipisah koma, contoh:
  `"belajar bahasa inggris, ai, teknologi, learning"`.
  **Bukan** `"#belajarBahasaInggris #AI"`.
- `slug` ikuti pola slugify backend: lowercase, semua non-alfanumerik jadi `-`,
  tanpa `-` di awal/akhir, maksimal 120 karakter.
- `content` markdown GFM penuh; sertakan heading `# Judul` di baris pertama.
- Tidak ada field lain (mis. `strategy_summary`, `tags` array) — payload di luar
  shape ini ditolak validasi zod.

### `blog_propose_update`
Revisi post yang sudah ada (cari `id` lewat resource `admin_blog_posts`).

```json
{ "id": 123, "data": { /* subset field blog_propose_create */ } }
```

### `blog_propose_publish`
Mengajukan publish/unpublish post yang sudah dibuat.

```json
{ "id": 123, "published": true, "publishedAt": "2026-06-11T09:00:00Z (opsional, ISO datetime)" }
```

### `blog_propose_saham_crypto_daily`
Khusus laporan pasar harian (kategori dipaksa `saham_crypto`). Dipakai cronjob,
tapi boleh dipanggil manual.

```json
{
  "title": "wajib",
  "slug": "opsional — di-generate dari marketDate + title jika kosong",
  "summary": "wajib — jadi description",
  "content": "wajib — markdown",
  "marketDate": "wajib — YYYY-MM-DD",
  "assets": ["IHSG", "BBCA", "BTC"],
  "sourceRuntime": "opsional, contoh: hermes-daily-market",
  "coverUrl": null
}
```

## Resources (read-only, untuk konteks)

- `porto://admin/blog/posts` — 50 post terbaru (id, title, slug, category, published).
  Pakai ini untuk cek duplikasi slug/judul sebelum propose, dan untuk mencari `id`.
- `porto://admin/blog/post/{id}` — detail satu post (untuk menyusun proposal update).
- `porto://public/blog/saham-crypto` — 50 laporan saham_crypto yang sudah published.

## Alur kerja standar

1. (Opsional) Baca `porto://admin/blog/posts` — pastikan slug belum dipakai.
2. (Opsional) `blog_prepare_draft` untuk kerangka, lalu kembangkan kontennya.
3. `blog_propose_create` dengan payload lengkap → catat `requestId` dari respons.
4. Laporkan ke user bahwa proposal menunggu approval di `/admin/mcp`.
5. Setelah user mengonfirmasi post sudah di-approve (post mendapat `id`),
   ajukan `blog_propose_publish` jika user memang minta langsung tayang.

## Contoh pemanggilan (tools/call)

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "blog_propose_create",
    "arguments": {
      "title": "7 Cara Cepat Belajar Bahasa Inggris di Era Teknologi 2026",
      "slug": "7-cara-cepat-belajar-bahasa-inggris-era-teknologi-2026",
      "description": "Strategi belajar bahasa Inggris berbasis AI dan aplikasi: 70% praktik aktif, 30% teori, konsistensi 15 menit per hari.",
      "content": "# 7 Cara Cepat Belajar Bahasa Inggris di Era Teknologi 2026\n\n...",
      "meta": "belajar bahasa inggris, ai, teknologi, learning",
      "category": "learning",
      "coverUrl": null
    }
  }
}
```

## Larangan

- Jangan membuat/mengusulkan endpoint atau file backend baru untuk publishing —
  tool di atas adalah satu-satunya jalur yang didukung.
- Jangan menyetel `published: true` lewat `blog_propose_create` (diabaikan server,
  selalu dipaksa `false`).
- Jangan mengirim hashtag, array tags, atau field di luar schema.
- Jangan mengklaim artikel tayang sebelum admin approve.
