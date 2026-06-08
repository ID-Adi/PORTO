# Rancangan Implementasi — Cron Job Saham → Blog (Analytic AI Agent)

Status: DRAFT RANCANGAN (belum diimplementasi)
Scope: SAHAM saja. Crypto akan dibuat terpisah dengan pola yang sama.
Tanggal rancangan: 2026-06-08

---

## ◆ 1. Tujuan & Prinsip

Membuat cron job harian yang:

1. **Scraping** data pasar saham (sudah ada: `RAG-scrapping-saham`).
2. **Menganalisis** data mentah menjadi narasi via **AI agent** (analytic, bukan template deterministik).
3. **Mem-posting** hasil sebagai **draft blog** kategori `saham` ke MCP PORTO (`market_blog_*`), masuk approval queue — **tidak publish otomatis**.
4. Output blog **rapi & terstruktur**: tabel, heading konsisten, disclaimer, sumber — agar client mudah membaca.

Prinsip yang dipertahankan dari sistem existing:

- **Tidak auto-publish** — semua draft masuk `mcp_action_requests`, direview admin di `/admin/mcp`.
- **Transparansi sumber** — blok Sumber + disclaimer edukasi wajib (tidak ada instruksi beli/jual).
- **Monokrom / editorial** — konten markdown bersih, scannable.

---

## ◆ 2. Kondisi Existing (yang sudah ada)

### Pipeline scraping — `/Users/bravo/Documents/RAG/RAG-scrapping-saham/`
- `scripts/run_daily_news.sh` — orkestrator paralel: berita (RSS+scrape+sentiment), IDX disclosure, corporate action, sosial, dan **market data** (`fetch_market_data.py` via yfinance).
- **Output artefak** tersimpan di `data/`:
  - `data/market.json` — IHSG OHLC, perubahan %, teknikal (RSI/MA/support/resistance), FX (USD/IDR, BTC/USD), top movers (gainers/losers/most_active), foreign_flow.
  - `data/news.jsonl` — berita + field sentiment per artikel.
- Sudah ada cron `Stock RAG Berita Saham Harian` (`0 6 * * 1-5`) yang menjalankan pipeline & **kirim ringkasan ke Telegram** (mode `--no-agent`, stdout verbatim).

### MCP market-blog — `/Users/bravo/Documents/PORTO/backend/src/mcp/domains/market-blog.ts`
- Tool `market_blog_create_stock_draft` (kategori `saham`) — **sudah ada**, tapi generator-nya (`backend/src/lib/market-blog/draft.ts`) **deterministik tanpa AI dan tanpa angka riil**. Hanya menyusun kerangka editorial kosong.
- Endpoint MCP: `POST /api/mcp` (JSON-RPC 2.0), auth `Authorization: Bearer $PORTO_MCP_TOKEN`.
- Env sudah tersedia di `~/.hermes/.env`: `PORTO_MCP_ENDPOINT`, `PORTO_MCP_TOKEN`.

### Blog rendering — `frontend/src/app/blog/[slug]/blog-post-view.tsx`
- Render markdown via `react-markdown` + `remark-gfm` (✓ **mendukung tabel GFM**), `rehype-highlight`, `rehype-slug`, autolink heading, TOC minimap dari heading `##`–`####`.
- Artinya: **tabel markdown, heading, blockquote, code block, list — semua langsung ter-render rapi**. Konten AI cukup keluarkan markdown GFM yang valid.

### Gap utama
> Tool MCP existing hanya membuat kerangka kosong. User ingin konten **diisi AI agent** dari data scraping riil, dengan **tabel & struktur rapi**. Jadi yang kurang adalah **lapisan analisis AI** + **jembatan dari hasil analisis ke MCP draft dengan konten markdown penuh**.

---

## ◆ 3. Keputusan Arsitektur

Ada dua opsi untuk men-generate konten. Kita pilih **Opsi A** karena paling cepat, fleksibel, dan tidak menyentuh backend.

### Opsi A (DIPILIH) — AI agent di sisi cron, konten lewat tool harian gabungan/legacy
- Cron job berjalan **mode AI agent** (bukan `--no-agent`).
- Script pre-fetch menjalankan pipeline scraping → kumpulkan `market.json` + ringkasan `news.jsonl` sebagai **konteks** ke prompt.
- AI agent menyusun **markdown lengkap** (dengan tabel) lalu memanggil MCP tool untuk membuat draft kategori `saham`.
- **Tool MCP yang dipakai**: perlu tool yang menerima `content` markdown penuh. Tool legacy `blog_propose_saham_crypto_daily` menerima `content` bebas, **tapi** kategorinya `saham_crypto`, bukan `saham`.

  → **Perlu penyesuaian backend kecil** (lihat §4): tambah dukungan `content` override pada `market_blog_create_stock_draft`, ATAU buat tool baru `blog_propose_stock_daily` (kategori `saham`, content bebas). Rekomendasi: **tool baru tipis** agar tidak merusak generator deterministik existing.

### Opsi B (tidak dipilih sekarang) — Generator AI di dalam backend
- Pindahkan analisis ke `draft.ts` (panggil LLM dari backend). Lebih berat: backend harus pegang API key LLM + data scraping. Menambah coupling. Ditunda.

**Kesimpulan arsitektur:** cron AI agent (Opsi A) + **1 tool MCP baru** `blog_propose_stock_daily` yang menerima konten markdown penuh dan menyimpan ke kategori `saham`.

---

## ◆ 4. Perubahan Backend (minimal)

### 4.1 Tool MCP baru — `blog_propose_stock_daily`
File: `backend/src/mcp/domains/market-blog.ts`

- Input:
  | Field | Tipe | Wajib | Catatan |
  | --- | --- | --- | --- |
  | `title` | string | ya | Judul laporan. |
  | `summary` | string | ya | → `description` (≤180 char). |
  | `content` | string | ya | **Markdown penuh dari AI** (boleh tabel GFM). Heading `# title` auto bila belum ada. |
  | `marketDate` | string | ya | `YYYY-MM-DD`. |
  | `assets` | string[] | tidak | mis. `["IHSG","BBCA","ANTM"]` → meta. |
  | `sources` | string[] | tidak | Blok Sumber + `sourceMetadata`. |
  | `sourceRuntime` | string | tidak | `cronjob-saham-daily`. |

- Behaviour: `category = "saham"`, `published = false`, slug `saham-${marketDate}-${slugify(title)}`, inject disclaimer bila belum ada, masuk `mcp_action_requests` (`action: blog_propose_create`) — **sama persis alur approval existing**.
- Guard: tetap tidak auto-publish; disclaimer wajib; sources disimpan.

### 4.2 Tidak mengubah generator deterministik
`buildStockDraft` lama tetap ada untuk pemakaian manual/non-AI. Tool baru hidup berdampingan.

### 4.3 Dokumentasi
Update `docs/mcp_saham_crypto_runtime.md` dengan section tool baru + contoh `tools/call`.

---

## ◆ 5. Struktur Konten Blog (output AI agent)

Markdown wajib mengikuti kerangka berikut agar konsisten & rapi di render frontend:

```
# Laporan Pasar Saham Indonesia — {tanggal}

> {disclaimer edukasi: bukan ajakan beli/jual, verifikasi mandiri}

## Ringkasan Eksekutif
{3-5 kalimat narasi AI: arah IHSG, sentimen, foreign flow}

## Snapshot IHSG
| Metrik | Nilai | Perubahan |
| --- | --- | --- |
| Close | 5.594,77 | -4,20% |
| Open / High / Low | ... | |
| Volume | ... | |
| RSI(14) | 10,7 | Oversold |
| Support / Resistance | ... | |

## Top Movers
| Kategori | Ticker | Close | Δ% | Catatan AI |
| --- | --- | --- | --- | --- |
| Gainer | INCO | 4.570 | +4,1% | ... |
| Loser | BREN | 3.590 | -10,25% | ... |

## Aliran Dana Asing (Foreign Flow)
| Ticker | Net (IDR) | Arah |
| --- | --- | --- |
{tabel ringkas + 1 paragraf interpretasi AI}

## Sentimen & Berita Kunci
- {3-5 headline penting + label sentimen + 1 kalimat dampak}

## Analisis & Poin Pemantauan
{narasi AI: level kunci, katalis, skenario — tanpa rekomendasi beli/jual}

## Catatan Risiko
{disclaimer + manajemen risiko umum}

## Sumber
- yfinance (IHSG, LQ45, FX)
- CNBC Indonesia (berita)
- IDX (disclosure, corporate action)
```

Aturan gaya konten:
- Angka format Indonesia bila memungkinkan; **tabel GFM** untuk semua data numerik.
- **Tidak ada** klaim harga real-time tanpa sumber; semua angka berasal dari `market.json` runtime.
- **Tidak ada** instruksi beli/jual. Bahasa Indonesia, tone technical/editorial.

---

## ◆ 6. Alur Cron Job (end-to-end)

```
[06:10 WITA, Senin-Jumat]
        │
        ▼
1. Pre-fetch script (run pipeline / reuse data terbaru)
   → hasil: market.json + news.jsonl (di RAG-scrapping-saham/data/)
        │
        ▼
2. Script context injector  (stdout = JSON ringkas market+news)
   → diinject ke prompt cron AI agent
        │
        ▼
3. AI agent (cron, model analitik)
   - baca konteks JSON
   - susun markdown lengkap (kerangka §5, tabel GFM)
   - panggil MCP tool blog_propose_stock_daily via curl
        │
        ▼
4. Draft masuk approval queue (mcp_action_requests, status pending)
        │
        ▼
5. Admin review di /admin/mcp → approve → blog draft kategori `saham`
        │
        ▼
6. Publish manual (toggle / blog_propose_publish)
```

Catatan timing: jalankan **setelah** pipeline existing (`0 6 * * 1-5`) selesai, mis. `10 6 * * 1-5`, agar `data/market.json` sudah fresh. Alternatif: script pre-fetch memanggil ulang pipeline secara mandiri.

---

## ◆ 7. Komponen yang Akan Dibuat

| # | Komponen | Lokasi | Jenis |
| --- | --- | --- | --- |
| 1 | Tool MCP `blog_propose_stock_daily` | `backend/src/mcp/domains/market-blog.ts` | Edit backend |
| 2 | Schema input tool baru | `backend/src/lib/market-blog/types.ts` | Edit backend |
| 3 | Script context-injector saham | `~/.hermes/profiles/work/scripts/stock_blog_context.sh` | Baru |
| 4 | Cron job AI agent saham→blog | via `cronjob action=create` | Baru |
| 5 | Update dokumentasi MCP | `docs/mcp_saham_crypto_runtime.md` | Edit docs |

Script #3 tugasnya: pastikan `data/market.json` fresh (run pipeline bila stale), lalu cetak JSON ringkas (market + top headline) ke stdout untuk diinject ke prompt. Tidak memanggil LLM.

Prompt cron #4 (ringkas): "Kamu analis pasar saham. Dari konteks JSON terlampir, susun laporan markdown rapi sesuai kerangka [§5], lalu panggil MCP `blog_propose_stock_daily` dengan curl ke `$PORTO_MCP_ENDPOINT` (Bearer `$PORTO_MCP_TOKEN`). Jangan publish. Laporkan requestId hasilnya."

---

## ◆ 8. Verifikasi & Test

1. **Backend**: `pnpm --dir backend build` + smoke `tools/list` harus memuat `blog_propose_stock_daily`.
2. **Manual call**: `curl` `tools/call` dengan content markdown contoh → cek row baru di `mcp_action_requests` (status pending).
3. **Approve** di `/admin/mcp` → cek blog post kategori `saham` (`published=false`).
4. **Render**: buka `/blog/{slug}` setelah publish → pastikan **tabel ter-render**, TOC muncul, disclaimer tampil.
5. **Cron dry-run**: `cronjob action=run` sekali → verifikasi draft terbuat & tidak auto-publish.

---

## ◆ 9. Risiko & Mitigasi

| Risiko | Mitigasi |
| --- | --- |
| Pipeline stale / `market.json` kosong | Script context cek timestamp; fallback skip + alert, jangan post draft kosong. |
| AI menghasilkan markdown rusak | Validasi minimal di prompt (kerangka tetap); render GFM toleran. |
| AI menambah rekomendasi beli/jual | Guard di prompt + disclaimer wajib di tool backend. |
| Token MCP bocor | Tetap di `~/.hermes/.env`, tidak di-commit, tidak di-print. |
| Crypto bercampur | Tool & cron terpisah; kategori `saham` strict. |

---

## ◆ 10. Rencana Pemisahan Crypto (nanti)

Pola identik: tool `blog_propose_crypto_daily` (kategori `crypto`), script context dari sumber crypto, cron terpisah. Tidak dikerjakan di fase ini.

---

### ➔ Kesimpulan & Langkah Selanjutnya

Rancangan siap. Fase ini **fokus saham**, perubahan backend **minimal** (1 tool MCP baru menerima konten markdown penuh), sisanya di sisi cron AI agent + script context. Blog akan rapi otomatis karena frontend sudah mendukung **GFM tables + TOC**.

Urutan eksekusi yang saya rekomendasikan begitu Anda setuju:
1. **Backend**: tambah tool `blog_propose_stock_daily` + schema, build & smoke test.
2. **Script context** `stock_blog_context.sh` (fresh-check + JSON ringkas).
3. **Cron AI agent** saham→blog (`10 6 * * 1-5`), dry-run sekali.
4. **Update docs** MCP runtime.
5. Verifikasi end-to-end (draft → approve → render tabel).

Konfirmasikan: lanjut ke implementasi dengan urutan ini, atau ada bagian rancangan yang ingin diubah dulu?
