# Blog Page Schema — Acuan Cronjob PORTO

Dokumen ini menjadi acuan saat membuat cronjob yang mengirim laporan ke blog PORTO. Fokusnya adalah bentuk payload, kategori, konten Markdown, dan alur publish sesuai implementasi blog page saat ini.

---

## ◆ 1. Ringkasan Implementasi Saat Ini

Blog PORTO memakai model data berbasis tabel `blog_posts` dan public page berbasis kategori.

| Area | Implementasi |
| --- | --- |
| Public list | `/blog` |
| Detail post | `/blog/[slug]` |
| Public API proxy | `/api/public/blog?category=<category>` |
| Backend public API | `/api/public/blog?category=<category>` |
| Admin list/edit | `/admin/blog` dan `/admin/blog/[id]` |
| Approval MCP | `/admin/mcp` |
| Sitemap | `/sitemap.xml` dari published posts |
| RSS | `/api/rss` dari published posts |

Prinsip utama:

- Cronjob **tidak publish langsung**.
- Cronjob membuat **draft proposal** lewat MCP.
- Admin review di **`/admin/mcp`**.
- Setelah approve, post dibuat sebagai **draft** di `blog_posts`.
- Publish dilakukan manual dari admin blog atau MCP publish proposal.

---

## ◆ 2. Kategori Blog

Kategori yang valid dan sudah disinkronkan frontend/backend:

| Category | Label UI | Fungsi |
| --- | --- | --- |
| `global` | Global | Artikel editorial/teknis umum. |
| `saham` | Saham | Laporan saham dari cronjob market agent. |
| `crypto` | Crypto | Laporan crypto dari cronjob market agent. |
| `saham_crypto` | Saham & Crypto / Gabungan | Legacy laporan gabungan saham + crypto. |

### Rekomendasi untuk cronjob baru

- Cronjob saham gunakan **`saham`**.
- Cronjob crypto gunakan **`crypto`**.
- Jangan gunakan **`global`** untuk laporan market otomatis.
- Gunakan **`saham_crypto`** hanya bila memang membuat laporan gabungan legacy.

---

## ◆ 3. Schema Tabel Blog

Field inti `blog_posts`:

| Field | Tipe | Wajib | Catatan cronjob |
| --- | --- | --- | --- |
| `title` | string | ya | Judul artikel. |
| `slug` | string | ya | Unique, lowercase, URL-safe. |
| `description` | string/null | tidak | Ringkasan pendek, idealnya ≤180 karakter. |
| `content` | string/null | ya untuk cron | Markdown penuh. |
| `meta` | string/null | tidak | Tag dipisah koma. Ditampilkan sebagai chips. |
| `category` | category string | ya | `saham`, `crypto`, `global`, atau `saham_crypto`. |
| `coverUrl` | string/null | tidak | URL/path gambar cover. Opsional. |
| `published` | boolean | ya | Untuk cron/MCP harus `false`. |
| `publishedAt` | date/null | tidak | Untuk cron/MCP harus `null`. |
| `createdAt` | date | auto | Dibuat backend/database. |
| `updatedAt` | date | auto | Diupdate backend/database. |

---

## ◆ 4. Public Blog Page Behavior

### `/blog`

Public blog list memakai tab kategori:

```text
Global | Saham | Crypto | Gabungan
```

Setiap tab memanggil:

```http
GET /api/public/blog?category=<category>
```

Contoh:

```http
GET /api/public/blog?category=saham
GET /api/public/blog?category=crypto
```

Post yang tampil di list harus memenuhi:

```ts
published === true
category === activeCategory
```

### Search/filter public

Search client-side mencocokkan:

- `title`
- `description`
- tag dari `meta`

Karena itu, cronjob sebaiknya mengisi **`title`**, **`description`**, dan **`meta`** dengan informatif.

---

## ◆ 5. Detail Blog Renderer

Detail page `/blog/[slug]` render `content` sebagai Markdown memakai:

- `react-markdown`
- `remark-gfm`
- `rehype-slug`
- `rehype-autolink-headings`
- `rehype-highlight`
- TOC minimap dari heading `##` sampai `####`

Konten cronjob boleh memakai:

- Heading Markdown: `#`, `##`, `###`, `####`
- Tabel GFM: `| Col | Col |`
- List: `- item`
- Blockquote: `> disclaimer`
- Link: `[label](https://...)`
- Code block bila perlu

### Struktur heading yang direkomendasikan

Gunakan **satu** heading `#` di awal dan section utama memakai `##` agar TOC muncul rapi.

```md
# Judul Artikel

> Disclaimer edukasi.

## Ringkasan Eksekutif

...

## Snapshot Market

| Metrik | Nilai | Catatan |
| --- | --- | --- |
| ... | ... | ... |

## Berita Penting

- ...

## Analisis & Poin Pemantauan

...

## Catatan Risiko

...

## Sumber

- ...
```

---

## ◆ 6. MCP Tool untuk Cronjob Saham

Gunakan tool:

```text
blog_propose_stock_daily
```

Kategori hasil:

```text
saham
```

Input schema:

| Field | Tipe | Wajib | Catatan |
| --- | --- | --- | --- |
| `title` | string | ya | Judul laporan. |
| `summary` | string | ya | Jadi `description` ≤180 karakter. |
| `content` | string | ya | Markdown penuh dari agent. |
| `marketDate` | string | ya | Format `YYYY-MM-DD`. |
| `assets` | string[] | tidak | Contoh `['IHSG', 'BBCA', 'ANTM']`. |
| `sources` | string[] | tidak | Akan masuk blok sumber/source metadata. |
| `sourceRuntime` | string | tidak | Contoh `cronjob-saham-daily`. |

Output sukses minimal:

```json
{
  "ok": true,
  "type": "stock",
  "draftId": "123",
  "requestId": 123,
  "category": "saham",
  "status": "pending_approval",
  "title": "Laporan Pasar Saham Indonesia — 2026-06-09",
  "slug": "saham-2026-06-09-laporan-pasar-saham-indonesia-2026-06-09",
  "approvalUrl": "/admin/mcp"
}
```

---

## ◆ 7. MCP Tool untuk Cronjob Crypto

Gunakan tool:

```text
blog_propose_crypto_daily
```

Kategori hasil:

```text
crypto
```

Input schema:

| Field | Tipe | Wajib | Catatan |
| --- | --- | --- | --- |
| `title` | string | ya | Judul laporan. |
| `summary` | string | ya | Jadi `description` ≤180 karakter. |
| `content` | string | ya | Markdown penuh dari agent. |
| `marketDate` | string | ya | Format `YYYY-MM-DD`. |
| `assets` | string[] | tidak | Contoh `['BTC', 'ETH', 'SOL']`. |
| `sources` | string[] | tidak | Akan masuk blok sumber/source metadata. |
| `sourceRuntime` | string | tidak | Contoh `cronjob-crypto-daily`. |

Output sukses minimal:

```json
{
  "ok": true,
  "type": "crypto",
  "draftId": "124",
  "requestId": 124,
  "category": "crypto",
  "status": "pending_approval",
  "title": "Crypto Daily Update — 09 Juni 2026",
  "slug": "crypto-2026-06-09-crypto-daily-update-09-juni-2026",
  "approvalUrl": "/admin/mcp"
}
```

---

## ◆ 8. Payload JSON-RPC MCP

Endpoint MCP memakai JSON-RPC 2.0.

Environment yang dipakai cronjob:

```bash
PORTO_MCP_ENDPOINT
PORTO_MCP_TOKEN
```

Jangan print token ke log.

### Contoh payload saham

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "blog_propose_stock_daily",
    "arguments": {
      "title": "Laporan Pasar Saham Indonesia — 2026-06-09",
      "summary": "IHSG melemah tajam dengan RSI oversold; aliran dana asing dan headline emiten menjadi fokus pemantauan.",
      "content": "# Laporan Pasar Saham Indonesia — 2026-06-09\n\n## Ringkasan Eksekutif\n\n...",
      "marketDate": "2026-06-09",
      "assets": ["IHSG", "BBCA", "TLKM"],
      "sources": ["yfinance", "CNBC Indonesia", "IDX"],
      "sourceRuntime": "cronjob-saham-daily"
    }
  }
}
```

### Contoh payload crypto

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "blog_propose_crypto_daily",
    "arguments": {
      "title": "Crypto Daily Update — 09 Juni 2026",
      "summary": "BTC dan ETH melemah tipis; total market cap turun, dengan dominasi BTC tetap tinggi.",
      "content": "# Crypto Daily Update — 09 Juni 2026\n\n## Ringkasan\n\n...",
      "marketDate": "2026-06-09",
      "assets": ["BTC", "ETH", "SOL"],
      "sources": ["CoinGecko", "Cointelegraph", "Decrypt"],
      "sourceRuntime": "cronjob-crypto-daily"
    }
  }
}
```

---

## ◆ 9. Aturan Konten untuk Cronjob

Cronjob harus menjaga kualitas konten agar cocok dengan blog renderer.

### Wajib

- Pakai Bahasa Indonesia untuk laporan market lokal/default.
- Pakai Markdown GFM valid.
- Sertakan `# <title>` di awal content.
- Sertakan disclaimer edukasi, bukan rekomendasi investasi.
- Sertakan section `## Sumber` bila ada sumber data.
- Semua angka harus berasal dari context/script output, bukan karangan model.
- Gunakan tabel untuk data numerik.
- Gunakan heading `##` untuk section utama agar TOC terbentuk.

### Dilarang

- Jangan auto-publish.
- Jangan set `published=true` dari cronjob.
- Jangan isi `publishedAt` dari cronjob.
- Jangan membuat rekomendasi beli/jual langsung.
- Jangan mengarang harga, market cap, volume, RSI, atau news.
- Jangan print token MCP.

---

## ◆ 10. Template Konten Saham

```md
# Laporan Pasar Saham Indonesia — {marketDate}

> Konten ini bersifat edukasi dan informasi, bukan rekomendasi investasi atau ajakan membeli/menjual aset.

## Ringkasan Eksekutif

{3-5 kalimat ringkasan IHSG, teknikal, foreign flow, dan sentimen berita.}

## Snapshot IHSG

| Metrik | Nilai | Catatan |
| --- | --- | --- |
| Close | {ihsg.close} | {ihsg.change_pct}% |
| Open / High / Low | {ihsg.open} / {ihsg.high} / {ihsg.low} | Range harian |
| Volume | {ihsg.volume} | Dari data runtime |
| RSI(14) | {technicals.rsi_14} | {technicals.signals} |
| Support / Resistance | {support_20d} / {resistance_20d} | Area teknikal |

## Top Movers

| Kategori | Ticker | Close | Δ% | Catatan |
| --- | --- | --- | --- | --- |
| Gainer | ... | ... | ... | ... |
| Loser | ... | ... | ... | ... |

## Aliran Dana Asing

| Ticker | Net (IDR) | Arah |
| --- | --- | --- |
| ... | ... | ... |

## Sentimen & Berita Kunci

- **{headline}** — {source}. {dampak singkat}.

## Analisis & Poin Pemantauan

{Narasi berbasis data: level kunci, katalis, volatilitas, tanpa instruksi beli/jual.}

## Catatan Risiko

{Risiko volatilitas, likuiditas, gap data, dan disclaimer edukasi.}

## Sumber

- yfinance
- CNBC Indonesia
- IDX
```

---

## ◆ 11. Template Konten Crypto

```md
# Crypto Daily Update — {tanggal Indonesia}

> Konten ini bersifat edukasi dan informasi, bukan financial advice atau ajakan membeli/menjual aset.

## Ringkasan

- {Poin utama BTC/ETH.}
- {Poin market cap/dominasi.}
- {Poin berita/katalis.}

## Market Snapshot

| Aset | Harga (USD) | 24h % | Market Cap |
| --- | --- | --- | --- |
| BTC | {btc.price_usd} | {btc.change_24h_pct}% | {btc.market_cap_usd} |
| ETH | {eth.price_usd} | {eth.change_24h_pct}% | {eth.market_cap_usd} |

Global: Total Market Cap {global.total_market_cap_usd} ({global.market_cap_change_pct_24h}% 24h), Dominasi BTC {global.btc_dominance}%, ETH {global.eth_dominance}%.

## Top Movers 24h

| Arah | Aset | Harga | 24h % |
| --- | --- | --- | --- |
| Gainer | ... | ... | ... |
| Loser | ... | ... | ... |

## Berita Penting Hari Ini

- **{headline}** — {source}. {link bila ada}.

## Analisis Singkat

{Narasi berbasis data: sentimen, dominasi, level psikologis, tanpa rekomendasi beli/jual.}

## Watchlist Besok

- {Aset/level/event yang perlu dipantau.}

## Disclaimer

Konten ini bersifat edukasi dan informasi, bukan financial advice atau ajakan membeli/menjual aset.

## Sumber

- CoinGecko
- Cointelegraph
- Decrypt
```

---

## ◆ 12. Checklist Cronjob Baru

Sebelum membuat cronjob baru, pastikan:

- [ ] Script context menghasilkan JSON ringkas dan valid.
- [ ] JSON punya `ok: true/false` agar agent bisa skip bila data gagal.
- [ ] Prompt melarang model mengarang angka.
- [ ] Prompt meminta Markdown GFM penuh.
- [ ] Payload memakai tool MCP sesuai kategori.
- [ ] `published` tidak pernah dikirim sebagai `true`.
- [ ] Token MCP tidak pernah dicetak.
- [ ] Output akhir cron cukup berisi status, `requestId`, title, dan approval URL.
- [ ] Setelah run pertama, cek `/admin/mcp`.
- [ ] Setelah approve, cek `/admin/blog`.
- [ ] Setelah publish, cek `/blog` pada tab kategori terkait.

---

## ◆ 13. File Source Terkait

| File | Fungsi |
| --- | --- |
| `frontend/src/app/blog/page.tsx` | Public blog list dan tab kategori. |
| `frontend/src/app/blog/[slug]/blog-post-view.tsx` | Renderer detail Markdown. |
| `frontend/src/features/public-data/blog-meta.ts` | Konstanta kategori, label, parser meta. |
| `frontend/src/features/public-data/types.ts` | Type public blog post. |
| `frontend/src/app/api/public/[...path]/route.ts` | Proxy public API + validasi category. |
| `frontend/src/features/admin/forms/blog-form.tsx` | Form admin create/edit blog. |
| `frontend/src/app/(admin)/admin/blog/page.tsx` | Admin list blog. |
| `frontend/src/app/(admin)/admin/blog/[id]/page.tsx` | Admin edit hydration. |
| `frontend/src/app/sitemap.ts` | Dynamic sitemap dari published posts. |
| `frontend/src/app/api/rss/route.ts` | Dynamic RSS dari published posts. |
| `backend/src/db/schema/blog-posts.ts` | Schema kategori blog. |
| `backend/src/mcp/domains/market-blog.ts` | Tool MCP market blog. |
| `backend/src/lib/market-blog/draft.ts` | Normalisasi draft harian. |

---

### ➔ Kesimpulan

Untuk cronjob baru, targetkan schema berikut:

```text
script context JSON → AI markdown GFM → MCP tool daily → pending_approval → admin approve → draft blog → manual publish → /blog tab category
```

Gunakan kategori **`saham`** untuk saham dan **`crypto`** untuk crypto agar langsung cocok dengan blog page saat ini.
