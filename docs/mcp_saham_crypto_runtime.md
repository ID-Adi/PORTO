# MCP Runtime — Laporan Harian Saham & Crypto

Panduan agar agent CLI (cronjob harian) bisa mengirim hasil runtime Saham/Crypto
ke backend PORTO sebagai **proposal blog** kategori `saham_crypto`. Tool ini
**tidak publish langsung** — tetap mengikuti model approval MCP yang sudah ada.

## Endpoint MCP

- `GET /api/mcp` — discovery / health.
- `POST /api/mcp` — JSON-RPC 2.0.

Base URL backend (produksi): `https://api.pawa.my.id`.

## Autentikasi

Kirim header:

```
Authorization: Bearer <MCP_TOKEN>
```

Token dibuat dari dashboard admin MCP (tRPC `generateMcpToken` / UI admin MCP).
Hanya hash SHA-256-nya yang disimpan di `ai_tool_settings`. Simpan token asli di
env runtime agent, mis. `PORTO_MCP_TOKEN`. Jangan commit token ke repo.

## JSON-RPC method yang didukung

- `initialize`
- `tools/list`
- `tools/call`
- `resources/list`
- `resources/read`

## Tool runtime: `blog_propose_saham_crypto_daily`

Membuat satu approval request (`mcp_action_requests`) dengan:

- `domain: "blog"`
- `action: "blog_propose_create"`
- `payload.category = "saham_crypto"`
- `payload.published = false`
- `payload.publishedAt = null`

### Input

| Field           | Tipe        | Wajib | Catatan |
| --------------- | ----------- | ----- | ------- |
| `title`         | string      | ya    | Judul laporan. |
| `slug`          | string      | tidak | Jika kosong, dibuat dari `saham-crypto-${marketDate}-${title}`. |
| `summary`       | string      | ya    | Jadi `description` (dipotong 180 char) + intro konten. |
| `content`       | string      | ya    | Markdown. Heading `# title` otomatis ditambah bila belum ada. |
| `marketDate`    | string      | ya    | `YYYY-MM-DD` (tidak strict; ikut runtime). |
| `assets`        | string[]    | tidak | Contoh `["IHSG","BBCA","BTC","ETH"]` — masuk ke meta tag. |
| `sourceRuntime` | string      | tidak | Contoh `cronjob-saham-daily`. |
| `coverUrl`      | string/null | tidak | URL cover opsional. |

`meta` di-generate compact: `saham, crypto, daily, <marketDate>, <≤6 aset pertama>`.

### Return

```jsonc
{
  "id": 123,
  "requestId": 123,
  "category": "saham_crypto",
  "slug": "saham-crypto-2026-06-08-...",
  "status": "pending",
  "sourceRuntime": "cronjob-saham-daily"
  // ...kolom mcp_action_requests lainnya
}
```

## Contoh `tools/call` via curl

```bash
curl -sS "$PORTO_BACKEND_URL/api/mcp" \
  -H "Authorization: Bearer $PORTO_MCP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "blog_propose_saham_crypto_daily",
      "arguments": {
        "title": "Saham & Crypto Daily - 2026-06-08",
        "marketDate": "2026-06-08",
        "summary": "Ringkasan kondisi pasar harian.",
        "content": "## IDX\n\n...\n\n## Crypto\n\n...",
        "assets": ["IHSG", "BBCA", "BTC", "ETH"],
        "sourceRuntime": "cronjob-saham-daily"
      }
    }
  }'
```

## Alur approval

1. Tool **membuat proposal**, bukan publish langsung.
2. Admin meninjau & approve request di dashboard MCP (`approveMcpActionRequest`).
3. Setelah approve, post tercipta sebagai **draft** kategori `saham_crypto`
   (`published = false`).
4. Publish dilakukan terpisah lewat tool `blog_propose_publish` atau toggle
   Published di dashboard admin.

## Resource terkait

- `porto://admin/blog/posts` — daftar 50 post terbaru (kini menyertakan `category`).
- `porto://public/blog/saham-crypto` — 50 laporan Saham & Crypto yang sudah published.

---

# Runtime MCP market-blog (saham & crypto terpisah)

Selain tool harian gabungan di atas, tersedia runtime market-blog yang membuat
draft **terpisah** per jenis aset (kategori `saham` atau `crypto`). Cocok dipanggil
cron per-topik. Sama seperti legacy: **tidak publish otomatis** — semua masuk
approval queue `mcp_action_requests` (`action: blog_propose_create`), direview &
approve admin di **`/admin/mcp`**.

Generator memakai template deterministik (tanpa API harga eksternal) yang selalu
menyertakan **disclaimer** edukasi dan blok **Sumber**.

## Tools

### `market_blog_create_stock_draft`

Input (semua opsional kecuali guard minimum):

| Field       | Tipe                                   | Catatan |
| ----------- | -------------------------------------- | ------- |
| `topic`     | string                                 | Guard: `topic` **atau** `ticker` wajib salah satu. |
| `ticker`    | string                                 | mis. `BBCA`. |
| `market`    | `"IDX" \| "US"`                        | default `IDX`. |
| `timeframe` | `"daily" \| "weekly" \| "monthly"`     | default `weekly`. |
| `language`  | `"id" \| "en"`                         | default `id`. |
| `tone`      | `"editorial" \| "technical" \| "beginner"` | default `technical`. |
| `sources`   | string[]                               | Disertakan di blok Sumber + meta. |

### `market_blog_create_crypto_draft`

Sama, dengan `asset` (mis. `BTC`) dan `chain` menggantikan `ticker`/`market`.
Guard: `topic` **atau** `asset` wajib salah satu.

### `market_blog_submit_for_approval`

Input `{ draftId, note? }`. Di model queue, draft sudah masuk antrean saat dibuat —
tool ini mengonfirmasi & mengembalikan status terkini (idempoten).

### `market_blog_get_approval_status`

Input `{ draftId }`. Output status state machine: `pending_approval | approved |
rejected | published` (+ `reviewNote` bila ada). `approved` = draft sudah dibuat
admin; `published` = blog post-nya sudah dipublikasikan.

## Return create (contoh)

```jsonc
{
  "ok": true,
  "type": "stock",
  "draftId": "123",            // = id mcp_action_requests
  "status": "pending_approval",
  "title": "Analisis Saham BBCA (IDX) — mingguan",
  "slug": "bbca-weekly-idx-2026-06-08",
  "summary": "Tinjauan mingguan untuk BBCA (IDX) — konteks, poin pemantauan, dan catatan risiko.",
  "approvalUrl": "/admin/mcp",
  "sources": ["https://idx.co.id/data"]
}
```

## Payload cron siap pakai

```json
{ "name": "market_blog_create_stock_draft",
  "arguments": { "topic": "Ringkasan IHSG sektor energi minggu ini", "market": "IDX", "timeframe": "weekly", "language": "id", "tone": "technical" } }
```

```json
{ "name": "market_blog_create_crypto_draft",
  "arguments": { "topic": "Update Bitcoin & Ethereum minggu ini", "asset": "BTC", "timeframe": "weekly", "language": "id", "tone": "technical" } }
```

## Guard yang dijamin runtime

- Tidak auto publish (`published=false`; post baru dibuat saat admin approve).
- Validasi input minimum: saham butuh `topic`/`ticker`, crypto butuh `topic`/`asset`.
- Disclaimer edukasi selalu disertakan di konten.
- `sources` selalu disimpan (blok Sumber + `sourceMetadata`).
- Tidak ada instruksi beli/jual; tidak ada klaim harga real-time.

---

# Tool harian saham berbasis AI agent: `blog_propose_stock_daily`

Berbeda dari `market_blog_create_stock_draft` (generator template deterministik,
kerangka kosong), tool ini menerima **konten markdown PENUH** yang disusun runtime
AI agent (cron) dari data scraping riil. Backend hanya menormalkan: menjamin
heading judul, **disclaimer**, dan blok **Sumber** hadir, lalu meng-enqueue ke
approval queue. Tabel GFM dibiarkan apa adanya — frontend render via `remark-gfm`.

Kategori hasil: `saham`. **Tidak auto-publish** — masuk `mcp_action_requests`
(`action: blog_propose_create`), direview & approve admin di `/admin/mcp`.

## Input

| Field           | Tipe        | Wajib | Catatan |
| --------------- | ----------- | ----- | ------- |
| `title`         | string      | ya    | Judul laporan. |
| `summary`       | string      | ya    | → `description` (≤180 char). |
| `content`       | string      | ya    | **Markdown penuh** dari AI (boleh tabel GFM). Heading `# title` + disclaimer + blok Sumber di-inject otomatis bila belum ada. |
| `marketDate`    | string      | ya    | `YYYY-MM-DD`. Dipakai untuk slug & meta. |
| `assets`        | string[]    | tidak | mis. `["IHSG","BBCA","ANTM"]` → meta (≤6 pertama). |
| `sources`       | string[]    | tidak | Blok Sumber + `sourceMetadata.sources`. |
| `sourceRuntime` | string      | tidak | mis. `cronjob-saham-daily`. |

Slug: `saham-${marketDate}-${slugify(title)}`. Meta compact:
`saham, daily, <marketDate>, <≤6 aset>, <host sumber>`.

## Return (contoh)

```jsonc
{
  "ok": true,
  "type": "stock",
  "draftId": "456",
  "requestId": 456,
  "category": "saham",
  "status": "pending_approval",
  "title": "Laporan Pasar Saham Indonesia — 2026-06-08",
  "slug": "saham-2026-06-08-laporan-pasar-saham-indonesia-2026-06-08",
  "approvalUrl": "/admin/mcp",
  "sources": ["yfinance (IHSG, LQ45, FX)", "CNBC Indonesia (berita)"]
}
```

## Contoh `tools/call` via curl

```bash
curl -sS "$PORTO_MCP_ENDPOINT" \
  -H "Authorization: Bearer *** \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0", "id": 1, "method": "tools/call",
    "params": {
      "name": "blog_propose_stock_daily",
      "arguments": {
        "title": "Laporan Pasar Saham Indonesia — 2026-06-08",
        "summary": "IHSG terkoreksi 4,2% ke 5.594; RSI oversold; asing net sell.",
        "content": "# Laporan Pasar Saham Indonesia — 2026-06-08\n\n## Snapshot IHSG\n\n| Metrik | Nilai |\n| --- | --- |\n| Close | 5.594,77 |\n",
        "marketDate": "2026-06-08",
        "assets": ["IHSG", "BBCA", "ANTM"],
        "sources": ["yfinance", "CNBC Indonesia"],
        "sourceRuntime": "cronjob-saham-daily"
      }
    }
  }'
```

## Runtime cron terkait

- **Script context**: `~/.hermes/profiles/work/scripts/stock_blog_context.sh`
  — cek freshness `data/market.json` (run pipeline bila stale >18 jam), cetak JSON
  ringkas (market + berita) ke stdout untuk diinject ke prompt cron. Tidak panggil
  LLM, tidak post MCP.
- **Cron job**: "Saham → Blog (AI Agent Analytic)" (`10 6 * * 1-5`), job_id
  `11b914d07473`. Mode AI agent: parse konteks → susun markdown kerangka rapi →
  panggil `blog_propose_stock_daily` → laporkan requestId ke Telegram.
  **Status awal: paused** sampai backend (tool ini) di-deploy ke produksi
  (`https://api.pawa.my.id/api/mcp`).

---

# Tool harian crypto berbasis AI agent: `blog_propose_crypto_daily`

Paralel penuh dengan `blog_propose_stock_daily`, untuk ranah **crypto**. Menerima
**konten markdown PENUH** yang disusun runtime AI agent (cron) dari data riil.
Kategori hasil: `crypto`. **Tidak auto-publish** — masuk `mcp_action_requests`
(`action: blog_propose_create`), direview & approve admin di `/admin/mcp`.
Backend menjamin heading judul, **disclaimer**, dan blok **Sumber** hadir.

## Input

| Field           | Tipe        | Wajib | Catatan |
| --------------- | ----------- | ----- | ------- |
| `title`         | string      | ya    | mis. "Crypto Daily Update — 09 Juni 2026". |
| `summary`       | string      | ya    | → `description` (≤180 char). |
| `content`       | string      | ya    | **Markdown penuh** dari AI (boleh tabel GFM). |
| `marketDate`    | string      | ya    | `YYYY-MM-DD`. Slug & meta. |
| `assets`        | string[]    | tidak | mis. `["BTC","ETH","SOL"]` → meta (≤6 pertama). |
| `sources`       | string[]    | tidak | Blok Sumber + `sourceMetadata.sources`. |
| `sourceRuntime` | string      | tidak | mis. `cronjob-crypto-daily`. |

Slug: `crypto-${marketDate}-${slugify(title)}`. `sourceMetadata` memuat
`chain: "Multi-chain"` (bukan `market`).

## Sumber data crypto (CoinGecko + RSS, gratis tanpa key)

- **CoinGecko** `/global` (total market cap, dominasi BTC/ETH, perubahan 24h) +
  `/coins/markets` (BTC, ETH, top coins, top movers 24h).
- **RSS**: Cointelegraph (`https://cointelegraph.com/rss`) + Decrypt
  (`https://decrypt.co/feed`). CoinDesk RSS tidak reliabel — tidak dipakai.

## Runtime cron crypto

- **Script context**: `~/.hermes/profiles/work/scripts/crypto_blog_context.sh`
  — fetch CoinGecko global+markets, parse RSS Cointelegraph+Decrypt, cetak JSON
  ringkas (global, btc, eth, top_coins, top_movers, news, assets) ke stdout.
  Self-contained (tidak butuh pipeline external). Guard: `{"ok":false}` bila
  CoinGecko gagal → AI agent SKIP. Tidak panggil LLM, tidak post MCP.
- **Cron job**: "Crypto → Blog (AI Agent Analytic)" (`15 6 * * *`, harian termasuk
  weekend karena crypto 24/7), job_id `ef718c6cad58`. Mode AI agent: parse konteks
  → susun markdown 7-bagian (Ringkasan, Market Snapshot, Berita, Analisis,
  Watchlist, Disclaimer) → panggil `blog_propose_crypto_daily` → lapor ke Telegram.
  **Status awal: paused** sampai backend di-deploy ke produksi.
