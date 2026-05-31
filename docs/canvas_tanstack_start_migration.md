# Canvas `/canvas` → TanStack Start Migration Plan

Dokumen ini adalah hasil **Fase 6 — TanStack Start migration planning** dari `docs/canvas_agent_tanstack_sse_refactor_plan.md`. Ini rencana eksekusi-siap untuk memindahkan route `/canvas` (canvas Excalidraw + AI agent chat SSE) dari Next.js ke TanStack Start, **bukan** kode yang sudah ditulis.

Baca dokumen induk `canvas_agent_tanstack_sse_refactor_plan.md` lebih dulu — bagian `Strict Cleanup Rules`, `Keputusan Arsitektur`, dan `Risiko dan Mitigasi` mengikat dokumen ini.

---

## 1. Status & Prasyarat

### Status

- Scope iterasi ini: **planning-only**. Belum ada folder `frontend-start/` dan belum ada kode app TanStack Start yang ditulis.
- Fase 1-5 (SSE-first di Next.js/Hono) sudah selesai. Streaming chat, TanStack Query native cache, dan penghapusan polling sudah berjalan di app Next.js saat ini.

### Gate prasyarat sebelum koding migrasi dimulai

Koding migrasi **belum boleh dimulai** sebelum manual test `/canvas` SSE tuntas di environment dengan auth + backend aktif. Checklist gate (dari `Fase 5 - Validasi akhir SSE-first` dokumen induk):

- [ ] create workflow
- [ ] send prompt
- [ ] stream response (assistant muncul bertahap)
- [ ] mention `@frame`
- [ ] proposal approve / apply
- [ ] retry failed run
- [ ] switch workflow
- [ ] reload page (message final tetap dari database)

> Catatan keputusan: pemilik proyek memilih **menunda** gate ini saat menyusun rencana. Rencana boleh ditulis sekarang, tetapi scaffold `frontend-start/` tetap menunggu gate di atas hijau agar tidak memigrasi behavior yang belum terbukti stabil.

### Keputusan arsitektur kunci

- **Backend Hono standalone dipertahankan apa adanya** selama transisi. App TanStack Start baru hanya menjadi frontend consumer yang menunjuk ke `${BACKEND_URL}` yang sama (tRPC `/api/trpc`, SSE `/api/canvas-agent/...`, cookie session better-auth) — persis seperti yang dilakukan Next.js sekarang.
- Memindahkan tRPC/SSE ke server routes TanStack Start adalah opsi **fase final**, bukan transisi. Ini menjaga "API backend/database masih sama selama transisi" (Fase 6 dokumen induk) dan memperkecil blast radius.

---

## 2. Strategi branch & koeksistensi

Tunduk pada `Strict Cleanup Rules` dokumen induk ("tidak boleh ada folder eksperimen `frontend-start/` yang abandoned").

- Migrasi dikerjakan di **branch khusus**, mis. `tanstack-start-canvas`, bukan langsung di `main`.
- App TanStack Start baru hidup di folder **`frontend-start/`** dan **wajib** menyertakan `frontend-start/README.md` berisi:
  - Owner / penanggung jawab.
  - Command: `pnpm --dir frontend-start dev`, `pnpm --dir frontend-start build`.
  - Cleanup plan: jika branch ditinggalkan tanpa merge dalam jangka yang disepakati, folder dihapus.
- Next.js (`frontend/`) tetap menjadi sumber kebenaran `/canvas` sampai parity tercapai di `frontend-start/`. Setelah parity, baru route portfolio/admin lain dipertimbangkan untuk ikut pindah.
- **Tidak boleh ada dua sistem chat aktif permanen** — selama transisi, hanya satu app yang dipakai user di production; `frontend-start/` adalah target migrasi, bukan deploy paralel.

---

## 3. Scaffold target

Struktur `frontend-start/` selaras dengan blok `Refactor File Target` dokumen induk:

```txt
frontend-start/
  README.md                       # owner, command, cleanup plan (WAJIB)
  vite.config.ts                  # plugin TanStack Start
  package.json                    # react, @tanstack/react-{router,start,query}, vite
  src/
    router.tsx                    # buat QueryClient + router context
    routes/
      __root.tsx                  # root route + provider + auth bootstrap
      canvas.tsx                  # route /canvas, ssr: false
    integrations/
      trpc.ts                     # tRPC client (httpBatchLink, credentials: include)
      backend-url.ts              # ${BACKEND_URL}
    features/
      canvas/                     # canvas-shell, canvas-client, canvas-excalidraw, workflow-context
      canvas-agent/
        api/                      # canvas-agent-api, stream, query-keys, types, cache, utils
        hooks/                    # canvas-agent-hooks, stream hook
        components/               # panel, message-list, proposal-list, composer, run-errors, history-menu
```

### `src/router.tsx`

- Buat satu `QueryClient` dengan opsi **identik** dengan `frontend/src/lib/query-client.ts` saat ini: `defaultOptions.queries.staleTime = 60_000` (1 menit), `gcTime = 24 jam`, `retry = 1`.
- Inject `queryClient` ke router context (lihat `__root.tsx`).
- Setup `setupRouterWithQueryClient`/integrasi resmi agar loader bisa `context.queryClient.ensureQueryData(...)` dan komponen `useQuery` memakai cache yang sama.

### `src/routes/__root.tsx`

Pakai `createRootRouteWithContext` agar QueryClient tersedia di seluruh route (referensi docs TanStack Start — root route with QueryClient context):

```tsx
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: async () => {
    const user = await fetchSession() // server function, lihat §5
    return { user }
  },
  component: RootComponent,
})
```

- `RootComponent` membungkus `<QueryClientProvider client={queryClient}>` + `<Outlet/>`, plus `<HeadContent/>`/`<Scripts/>` di document shell, dan `ReactQueryDevtools` di dev.
- **Hanya satu** `QueryClientProvider` (Strict Cleanup Rules: tidak boleh duplicate provider).

### `src/routes/canvas.tsx`

Route `/canvas` **wajib** `ssr: false` karena Excalidraw + `localStorage` + canvas API hanya hidup di browser. Docs TanStack Start memberi contoh resmi persis untuk `/canvas`:

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/canvas')({
  ssr: false,            // editor butuh browser API; jangan SSR
  component: CanvasShell,
})
```

Hanya shell + data ringan yang boleh SSR; editor di-hydrate setelah client siap.

---

## 4. Mapping file pindah

Logic di-**copy/move apa adanya** (bukan rewrite); yang berubah hanya import path dan cara mengambil provider/context.

| Sumber sekarang (`frontend/src/...`) | Tujuan (`frontend-start/src/...`) | Catatan SSR / boundary |
| --- | --- | --- |
| `app/canvas/canvas-shell.tsx`, `app/canvas/canvas-client.tsx`, `app/canvas/canvas-excalidraw.tsx` | `features/canvas/` | client-only, di bawah route `ssr:false`. `canvas-client.tsx` tetap owner `apiRef`, scene save/load, `activeWorkflowId`, `switchWorkflow`, `ensureWorkflow` |
| `app/canvas/canvas-workflow-context.tsx`, `canvas-workflow-picker.tsx` | `features/canvas/` | context tetap tipis (tidak menyimpan messages/stream/proposal); localStorage key versi sama (`porto:canvas:agent-active-workflow:v1`) |
| `app/canvas/canvas-agent-{api,stream,query-keys,types,cache,utils}.ts` | `features/canvas-agent/api/` | identik; stream tetap fetch + ReadableStream parser |
| `app/canvas/canvas-agent-hooks.ts` + stream hook | `features/canvas-agent/hooks/` | identik; hanya import path berubah |
| `app/canvas/canvas-agent-{panel,message-list,proposal-list,composer,run-errors,history-menu}.tsx` | `features/canvas-agent/components/` | presentasional; tetap tidak tahu query key |
| `context/trpc-provider.tsx` + `lib/{query-client,trpc,backend-url}.ts` | `router.tsx` + `integrations/` | satu QueryClient via router context; tRPC client tetap `httpBatchLink` ke `${BACKEND_URL}/api/trpc` dengan `credentials: "include"` |
| `app/canvas/page.tsx` (metadata `robots: noindex`) | `routes/canvas.tsx` head/meta | metadata pindah ke route `head()` |

Aturan yang dipertahankan:

- `sceneData` **tidak** masuk chat query, SSE payload, atau workflow list — tetap hanya lewat endpoint scene (lazy).
- Tidak mengganti nama teknis Excalidraw import/type/API.
- Satu concern per file; hook boleh tahu query key, komponen presentasional tidak.

---

## 5. Auth bootstrap lintas-origin

Backend better-auth memakai **cookie session** (`auth.api.getSession({ headers })`). App TanStack Start berjalan di origin/port berbeda dari Next.js, jadi:

- **CORS backend:** `isAllowedOrigin` di `backend/src/index.ts` harus mengizinkan origin dev TanStack Start. Saat ini sudah mengizinkan `http://localhost:3000` dan `http://localhost:3001` serta `*.pawa.my.id`. Bila app Start dev di port lain, **tambah port itu** ke `isAllowedOrigin`. Ini satu-satunya sentuhan backend yang mungkin perlu, dan **hanya config CORS — bukan perubahan logic**.
- **Client requests:** tRPC client dan fetch SSE tetap memakai `credentials: "include"` agar cookie session ikut terkirim lintas-origin.
- **Bootstrap di root:** `beforeLoad` di `__root.tsx` memanggil server function `fetchSession()` yang mem-forward cookie request ke `${BACKEND_URL}/api/auth/get-session`, lalu mengembalikan user (atau `null`). Route guard `/canvas` redirect ke login bila `null`.
- **Enforce server-side:** auth tetap di-enforce di endpoint backend (tRPC `authenticatedProcedure` + cek session di SSE route), bukan hanya route guard frontend — RPC/SSE endpoint tetap bisa dipanggil langsung (referensi `Referensi Teknis` dokumen induk).

---

## 6. SSE di TanStack Start

### Transisi (default)

SSE tetap di Hono: `POST /api/canvas-agent/workflows/:workflowId/messages/stream`. File `canvas-agent-stream.ts` + `canvas-agent-api.ts` dipakai **apa adanya** (fetch dengan `credentials: "include"` + parser `text/event-stream` yang men-split `\r?\n\r?\n`). Tidak ada perubahan jalur streaming saat transisi.

### Fase final (opsional — dokumentasi saja, bukan transisi)

Bila kelak SSE dipindah ke server route TanStack Start, pola resminya:

```ts
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/canvas-agent/workflows/$workflowId/messages/stream')({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        // auth via better-auth session dari request headers
        const stream = new ReadableStream({ /* share runCanvasAgentRun */ })
        return new Response(stream, {
          headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-store' },
        })
      },
    },
  },
})
```

Wajib **share `runCanvasAgentRun`** dari `backend/src/lib/canvas-agent-runner.ts` (jangan copy-paste provider call/prompt/parser/persist). Ini **bukan** bagian transisi dan hanya dikerjakan setelah parity tercapai.

---

## 7. Server functions non-streaming (fase final, opsional)

Kandidat operasi typed RPC yang kelak bisa menjadi TanStack Start server functions (dari dokumen induk):

`listWorkflows`, `getWorkflow`, `getWorkflowMessages`, `getWorkflowScene`, `createWorkflow`, `updateWorkflow`, `saveWorkflowScene`, `deleteWorkflow`, `updateProposalStatus`, `retryRun`.

Selama transisi: **tetap tRPC ke Hono**. Jangan pindahkan semua endpoint sekaligus. Pindahkan per-resource hanya setelah parity dan ada alasan jelas (mis. butuh SSR loader). Database schema dan runner logic tetap dipertahankan.

---

## 8. Urutan eksekusi koding (untuk agent berikutnya, setelah gate §1 hijau)

Berurutan sesuai checklist Fase 6 dokumen induk:

1. Review ulang dokumentasi TanStack Start terbaru.
2. Scaffold `frontend-start/` (React, TanStack Router, TanStack Query, Vite) + `README.md`.
3. `src/router.tsx` — QueryClient (opsi identik dengan `frontend`) + router context.
4. `src/routes/__root.tsx` — `createRootRouteWithContext`, satu `QueryClientProvider`, auth bootstrap `beforeLoad`.
5. `src/routes/canvas.tsx` — `ssr: false`, render shell.
6. Pindahkan canvas shell + workflow context (§4).
7. Jadikan Excalidraw island client-only (di bawah route `ssr:false`).
8. Pindahkan agent-* api/hooks/components; arahkan ke `${BACKEND_URL}` yang sama.
9. Verifikasi chat streaming jalan (lihat §11).
10. (Opsional, fase final) pindahkan server functions non-streaming dan/atau SSE server route.

---

## 9. Risiko & mitigasi

Selaras `Risiko dan Mitigasi` dokumen induk:

| Risiko | Mitigasi |
| --- | --- |
| Excalidraw SSR error (akses `window`/canvas/localStorage) | Route `/canvas` `ssr: false`; editor sebagai client-only island; SSR hanya shell |
| Cookie auth lintas-origin gagal | CORS backend izinkan origin Start + `credentials: "include"` di semua request; enforce auth server-side |
| Dua `QueryClient`/provider | Satu QueryClient via router context; satu `QueryClientProvider` di root |
| Scene payload besar | `scene` tetap lazy query terpisah; tidak pernah masuk chat/SSE/workflow list |
| Migrasi terlalu besar sekaligus | Branch khusus + parity `/canvas` dulu sebelum route lain |
| Message duplicate saat final event | Pertahankan `clientMessageId` optimistic + draft assistant by `runId` (sudah ada di stream hook) |

---

## 10. Rollback

- Migrasi terisolasi di branch `tanstack-start-canvas`; `main` tidak terdampak.
- Jika migrasi dibatalkan/ditinggalkan: hapus folder `frontend-start/` (tidak boleh tertinggal abandoned).
- Next.js `/canvas` di `frontend/` tetap sumber kebenaran sampai parity terbukti, sehingga rollback = lanjut pakai `frontend/`.

---

## 11. Validasi (saat koding nanti)

- `pnpm --dir frontend-start build` sukses.
- `/canvas` render tanpa hydration error.
- Excalidraw tampil dan interaktif.
- Agent chat streaming berjalan (assistant muncul bertahap, proposal muncul tanpa refresh, retry/switch/reload sesuai parity).
- Tidak ada `QueryClientProvider` ganda, tidak ada `frontend-start/` tanpa `README.md`, tidak ada copy-paste runner logic.
