# Canvas Agent TanStack SSE Refactor Plan

## Tujuan

Mengembangkan AI Agent Chat di `/canvas` menjadi chat agent yang streaming, cache-aware, dan siap dipakai untuk workflow panjang. Refactor ini wajib mengarah ke React + TanStack Start, dengan TanStack Router dan TanStack Query sebagai fondasi data flow.

Target utama:

- Jawaban AI tampil streaming via SSE, bukan menunggu run selesai lalu polling.
- TanStack Query menjadi layer utama untuk fetching API, caching, background update, request dedupe, pagination, lazy loading, optimistic update, dan sinkronisasi data.
- TanStack Start dipakai untuk SSR, streaming, server functions, server routes/API routes, bundling Vite, dan route architecture berbasis TanStack Router.
- Agent chat tetap menyatu dengan canvas workflow: chat, active frame refs, proposal, run status, scene canvas, dan history conversation tidak berjalan sendiri-sendiri.

## Referensi Teknis

- TanStack Start adalah full-stack React framework berbasis TanStack Router, dengan full-document SSR, streaming, server functions, server/API routes, middleware/context, full-stack bundling, dan type safety.
  Sumber: https://tanstack.com/start/v0/docs/framework/react/overview
- TanStack Start server functions dapat mengembalikan typed `ReadableStream`, dan dokumentasinya menempatkan streaming data sebagai pola yang cocok untuk AI apps.
  Sumber: https://tanstack.com/start/latest/docs/framework/react/guide/streaming-data-from-server-functions
- Server functions harus tetap meng-enforce auth di server function, bukan hanya route guard, karena RPC endpoint tetap bisa dipanggil langsung.
  Sumber: https://tanstack.com/start/v0/docs/framework/react/guide/server-functions
- TanStack Query mendukung optimistic update lewat `useMutation`, `onSettled`, invalidation, `useMutationState`, dan cache manipulation.
  Sumber: https://tanstack.com/query/v5/docs/framework/react/guides/optimistic-updates

## Kondisi Saat Ini

File utama saat ini:

- `frontend/src/app/canvas/canvas-agent-panel.tsx`
- `frontend/src/app/canvas/canvas-client.tsx`
- `frontend/src/app/canvas/canvas-workflow-context.tsx`
- `backend/src/trpc/routers/canvas-agent.ts`
- `backend/src/lib/canvas-agent-runner.ts`
- `backend/src/db/schema/canvas-agent.ts`

Pola saat ini:

- UI chat masih berada di Next.js client component.
- Data agent memakai tRPC `useQuery` dan `useMutation`.
- Saat run aktif, frontend melakukan polling `workflowQuery.refetch()` tiap `1800ms`.
- Optimistic user message sudah ada secara lokal di `canvas-agent-panel.tsx`.
- Assistant response dibuat setelah runner selesai, lalu frontend menunggu refetch.
- Scene canvas sudah dipisahkan dari workflow detail melalui `getWorkflowScene`, ini bagus dan harus dipertahankan karena scene bisa besar.

Masalah yang perlu diselesaikan:

- Streaming jawaban AI belum real-time.
- Polling run status boros dan terasa lambat untuk chat AI.
- Query cache masih tersebar lewat `trpc.useUtils()`, belum ada query-key contract eksplisit.
- Komponen agent panel terlalu banyak memegang concern: UI, mutation, optimistic update, polling, proposal action, workflow history, dan frame parsing.
- Jika migrasi ke TanStack Start dilakukan tanpa batas route yang jelas, Excalidraw bisa bermasalah karena route `/canvas` sangat bergantung browser APIs.

## Agent Handoff Runbook

Bagian ini adalah checkpoint utama untuk agent berikutnya. Update bagian ini setiap selesai satu fase bermakna, terutama bila konteks/token hampir habis.

### Current Status

- Dokumen ini adalah sumber utama untuk refactor AI Agent Chat `/canvas`.
- Arah kerja sudah dikunci: implementasi **SSE streaming di repo Next.js/Hono saat ini dulu**, lalu migrasi TanStack Start setelah chat streaming, cache, dan cleanup stabil.
- Fase 1-5 sudah diimplementasikan di current Next.js/Hono structure: panel dipecah, query cache native TanStack Query dipakai, SSE route backend ditambahkan, dan polling run aktif dihapus dari panel.
- Streaming provider masih memakai chunked final-response fallback dari runner karena provider call existing belum token-level streaming. Data final tetap masuk `canvas_agent_messages`, `canvas_agent_runs`, dan `canvas_agent_proposals`.
- **Fase 6 (migration planning) selesai sebagai dokumen**: `docs/canvas_tanstack_start_migration.md` berisi rencana eksekusi-siap migrasi `/canvas` ke TanStack Start (scaffold `frontend-start/`, root + QueryClient context, route `ssr:false`, auth bootstrap lintas-origin, mapping file, SSE/server functions). Backend Hono dipertahankan apa adanya selama transisi.

### Next Recommended Phase

Eksekusi koding migrasi (scaffold `frontend-start/` dst.) mengikuti `docs/canvas_tanstack_start_migration.md`, **hanya setelah gate manual test `/canvas` selesai** di environment auth/backend aktif. Gate ini sengaja ditunda saat planning, jadi belum boleh mulai scaffold sebelum hijau.

### Active Constraints

- `frontend/src/app/canvas/canvas-client.tsx` tetap owner scene canvas, `apiRef`, `activeWorkflowId`, `switchWorkflow`, dan `ensureWorkflow`.
- `frontend/src/app/canvas/canvas-workflow-context.tsx` harus tetap tipis dan tidak menyimpan state chat, stream, messages, runs, atau proposals.
- `frontend/src/app/canvas/canvas-agent-panel.tsx` harus diturunkan bertahap menjadi container.
- Backend SSE harus menjadi route khusus, tetapi data final tetap masuk tabel `canvas_agent_messages`, `canvas_agent_runs`, dan `canvas_agent_proposals`.
- Runner logic dari `backend/src/lib/canvas-agent-runner.ts` harus diekstrak atau dipakai ulang, bukan dicopy-paste.
- Satu QueryClient harus tetap dipakai selama tRPC dan TanStack Query native hidup berdampingan.
- `sceneData` tidak boleh masuk ke payload chat, SSE, workflow list, atau query messages.

### Files Touched by Latest Agent

- Inspected: `docs/canvas_agent_tanstack_sse_refactor_plan.md`
- Inspected: `frontend/src/app/canvas/canvas-agent-panel.tsx`
- Inspected: `frontend/src/app/canvas/canvas-client.tsx`
- Inspected: `frontend/src/app/canvas/canvas-workflow-context.tsx`
- Inspected: `frontend/src/app/canvas/canvas-workflow-picker.tsx`
- Inspected: `backend/src/trpc/routers/canvas-agent.ts`
- Inspected: `backend/src/lib/canvas-agent-runner.ts`
- Changed: `frontend/src/app/canvas/canvas-agent-panel.tsx`
- Changed: `frontend/src/app/canvas/canvas-workflow-picker.tsx`
- Changed: `frontend/src/app/canvas/canvas.css`
- Changed: `frontend/src/app/canvas/canvas-agent-*.ts(x)` helper/hook/component files
- Changed: `backend/src/index.ts`
- Changed: `backend/src/routes/canvas-agent-stream.ts`
- Changed: `backend/src/lib/canvas-agent-runner.ts`
- Changed: `backend/src/trpc/routers/canvas-agent.ts`
- Changed: `docs/canvas_agent_tanstack_sse_refactor_plan.md`
- Added: `docs/canvas_tanstack_start_migration.md` (Fase 6 migration plan)

### Verification Commands

Untuk update dokumentasi:

```bash
sed -n '1,260p' docs/canvas_agent_tanstack_sse_refactor_plan.md
sed -n '260,620p' docs/canvas_agent_tanstack_sse_refactor_plan.md
git diff -- docs/canvas_agent_tanstack_sse_refactor_plan.md
```

Untuk fase implementasi kode nanti:

```bash
pnpm --dir frontend lint
pnpm --dir frontend build
pnpm --dir backend exec tsc --noEmit
```

Jika backend schema berubah:

```bash
pnpm --dir backend db:generate
```

### Unresolved Blockers / Follow-up

- Token-level provider streaming belum diaktifkan. SSE sekarang mengirim `assistant_delta` dari chunked final response fallback; hapus fallback ini setelah Gemini/Vertex/OpenRouter call path dipindah ke streaming API provider.
- Manual test `/canvas` masih perlu dilakukan dengan backend dan sesi login aktif.
- TanStack Start migration belum boleh dimulai sebelum SSE-first path di current app stabil.

### Continuation Notes for Next Agent

- Jalur submit chat utama sekarang `POST /api/canvas-agent/workflows/:workflowId/messages/stream`.
- tRPC `sendMessage` lama sudah dihapus dari router; panel memakai stream hook.
- `retryRun` masih tRPC request-response dan masih enqueue runner async untuk run gagal.
- `sceneData` tetap hanya lewat endpoint scene dan tidak masuk query messages/SSE/workflow list.

## Rundown Pengerjaan

Checklist ini adalah urutan wajib. Jangan melompat ke TanStack Start sebelum fase SSE-first selesai.

- [x] Audit current canvas/chat flow dan dokumentasikan kondisi sekarang.
- [x] Pecah `canvas-agent-panel.tsx` tanpa perubahan behavior.
- [x] Samakan akses workflow list untuk agent panel dan workflow picker.
- [x] Tambahkan query keys dan cache patch helpers.
- [x] Tambahkan backend SSE route dan shared runner helpers.
- [x] Tambahkan frontend stream hook.
- [x] Ganti polling dengan cache update berbasis SSE event.
- [x] Hapus old/fallback paths yang sudah tidak dipakai.
- [x] Rencanakan TanStack Start route migration setelah current app stabil. (Lihat `docs/canvas_tanstack_start_migration.md`.)
- [ ] Eksekusi migrasi TanStack Start setelah gate manual test `/canvas` terpenuhi.

## Progress Log

Append satu baris setiap selesai fase bermakna. Gunakan tanggal absolut.

| Date | Agent | Phase | Files inspected | Files changed | Verification | Next handoff |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-05-31 | Codex | Documentation runbook setup | `docs/canvas_agent_tanstack_sse_refactor_plan.md`, `/canvas` frontend files, canvas agent backend files | `docs/canvas_agent_tanstack_sse_refactor_plan.md` | Markdown readback + `git diff -- docs/canvas_agent_tanstack_sse_refactor_plan.md` | Start Fase 1: split panel into hooks/components without behavior changes. |
| 2026-05-31 | Codex | Fase 1-5 SSE-first implementation | `frontend/src/app/canvas/*`, `backend/src/trpc/routers/canvas-agent.ts`, `backend/src/lib/canvas-agent-runner.ts`, `backend/src/index.ts` | Split `canvas-agent-panel.tsx` into hooks/components, added native TanStack Query keys/cache/API wrappers, added Hono SSE stream route, shared runner callbacks, removed panel polling and tRPC `sendMessage` path | `pnpm --dir frontend lint`, `pnpm --dir frontend build`, `pnpm --dir backend exec tsc --noEmit` | Manual `/canvas` SSE test, then Fase 6 TanStack Start migration planning. |
| 2026-05-31 | Claude | Fase 6 TanStack Start migration planning | `frontend/src/app/canvas/{page,canvas-shell,canvas-client}.tsx`, `frontend/src/context/trpc-provider.tsx`, `frontend/src/lib/query-client.ts`, `backend/src/index.ts`, `frontend/package.json`; TanStack Start docs (Context7) | Added `docs/canvas_tanstack_start_migration.md` (execution-ready migration plan: branch strategy, `frontend-start/` scaffold, root + QueryClient context, `/canvas` `ssr:false`, cross-origin cookie auth bootstrap, file mapping, SSE/server-function boundary, risks/rollback); updated runbook + rundown + progress log | Markdown readback; `git diff -- docs/` reads as additive (no `frontend/`/`backend/` code touched) | Eksekusi scaffold `frontend-start/` setelah gate manual test `/canvas` hijau. |

## Strict Cleanup Rules

- Tidak boleh ada dua sistem chat aktif permanen.
- Tidak boleh ada duplicate `QueryClientProvider`.
- Tidak boleh ada folder eksperimen `frontend-start/` yang abandoned.
- Tidak boleh ada unused files, unused exports, atau debug logs.
- Tidak boleh copy-paste provider call, prompt builder, parser, atau persist logic dari runner.
- Tidak boleh memasukkan `sceneData` ke chat query, SSE payload, atau workflow list.
- Tidak boleh menyisakan polling setelah SSE event final terbukti mengupdate cache.
- Tidak boleh mengganti istilah teknis Excalidraw import/type/API untuk kebutuhan rebrand UI.
- Tidak boleh menambah TODO generik; setiap TODO harus punya owner/fase penghapusan yang jelas.
- Tidak boleh menyelesaikan fase tanpa update `Progress Log`.

## Catatan Implementasi dari Source Code Saat Ini

Bagian ini wajib dibaca sebelum implementasi. Tujuannya menjaga refactor tetap sesuai kondisi repo sekarang, tidak meninggalkan code sampah, dan mudah dilanjutkan oleh AI agent lain.

### Yang Wajib Dihindari

- Jangan membuat dua sistem chat paralel. Saat SSE sudah menjadi jalur utama, jalur lama `sendMessage` + polling harus dipertahankan hanya sebagai fallback sementara yang jelas, lalu dihapus saat parity sudah aman.
- Jangan membiarkan `setInterval` polling tetap hidup setelah stream mengirim `run_started`, `assistant_message`, `proposal_created`, dan `run_completed`.
- Jangan membuat `frontend-start/` sebagai folder eksperimen permanen di main branch. Jika TanStack Start belum benar-benar menggantikan route, letakkan migration di branch khusus atau pastikan folder eksperimen punya owner, README, command, dan cleanup plan.
- Jangan membuat `QueryClientProvider` kedua. Repo sekarang sudah punya `frontend/src/lib/query-client.ts` dan `frontend/src/context/trpc-provider.tsx`; TanStack Query native harus memakai QueryClient yang sama selama masih hidup berdampingan dengan tRPC.
- Jangan mencampur cache tRPC dan query key native untuk data yang sama tanpa boundary. Untuk masa transisi, pilih satu source of truth per resource: `workflows`, `messages`, `runs`, `proposals`, atau `scene`.
- Jangan memasukkan `sceneData` ke query chat, SSE payload, atau workflow list. Scene tetap berat dan harus lazy-loaded lewat endpoint scene.
- Jangan menduplikasi provider call, prompt builder, parser output, dan logic persist assistant message di file stream baru. Ambil logic dari `backend/src/lib/canvas-agent-runner.ts` atau ekstrak helper bersama.
- Jangan menjalankan `enqueueCanvasAgentRun(runId)` dan stream runner untuk message yang sama. Itu akan membuat assistant message/proposal ganda.
- Jangan mengganti nama teknis Excalidraw import, type, selector, atau API kecuali memang sedang melakukan breaking migration. Rebrand hanya untuk rendered copy.
- Jangan menambah localStorage key baru untuk workflow/chat jika `canvas-workflow-context.tsx` masih bisa menjadi tempat versioned key yang sama.
- Jangan membuat invalidation besar seperti invalidate semua `canvasAgent` untuk setiap token stream. Patch cache granular, lalu invalidasi ringan hanya pada event final.
- Jangan membuat UI chat baru yang lebih ramai dari bahasa PORTO. Tetap compact, thin border, monokrom, icon-first, dan tidak memakai card bertumpuk.
- Jangan meninggalkan file `*.tmp`, `*.old`, komponen tidak dipakai, route sementara, atau duplicate helper setelah fase selesai.

### Boundary File yang Harus Dijaga

| Area | Source saat ini | Tanggung jawab setelah refactor |
| --- | --- | --- |
| Canvas scene dan workflow aktif | `frontend/src/app/canvas/canvas-client.tsx` | Tetap menjadi owner `apiRef`, load/save scene, `activeWorkflowId`, `switchWorkflow`, dan `ensureWorkflow`. Jangan pindahkan logic scene ke chat hook. |
| Context workflow | `frontend/src/app/canvas/canvas-workflow-context.tsx` | Tetap tipis: expose workflow aktif dan aksi workflow. Jangan isi dengan query messages, stream state, atau proposal state. |
| Agent panel | `frontend/src/app/canvas/canvas-agent-panel.tsx` | Turunkan menjadi container UI. Logic query, mutation, stream, history, dan proposal dipindah ke hook/komponen kecil. |
| Workflow picker | `frontend/src/app/canvas/canvas-workflow-picker.tsx` | Nantinya memakai hook workflow yang sama dengan panel supaya tidak ada dua query/invalidation pattern untuk list workflow. |
| Query client | `frontend/src/lib/query-client.ts` dan `frontend/src/context/trpc-provider.tsx` | Gunakan satu QueryClient selama transisi. TanStack Query native dan tRPC harus berbagi client yang sama. |
| Backend API | `backend/src/trpc/routers/canvas-agent.ts` | Tetap pegang CRUD request-response sampai server functions TanStack Start siap. Jangan pindahkan semua endpoint sekaligus. |
| Stream route | `backend/src/routes/canvas-agent-stream.ts` | Khusus SSE lifecycle: auth, stream headers, heartbeat, abort, event encode, dan handoff ke runner. |
| Agent runner | `backend/src/lib/canvas-agent-runner.ts` | Jadikan sumber logic provider, prompt, parser, dan persist result. Stream runner boleh mengekstrak helper, bukan copy-paste. |

### Struktur Refactor yang Disarankan di Repo Sekarang

Sebelum TanStack Start final, pecah code di folder `/canvas` yang sudah ada:

```txt
frontend/src/app/canvas/
  canvas-agent-panel.tsx              # container: gabungkan komponen dan hooks
  canvas-agent-types.ts               # type UI/event kecil, ambil dari API output bila bisa
  canvas-agent-query-keys.ts          # single query key contract
  canvas-agent-api.ts                 # wrapper fetch/tRPC sementara
  canvas-agent-stream.ts              # SSE parser, AbortController, event helpers
  canvas-agent-hooks.ts               # useCanvasAgentChat/useCanvasAgentWorkflows
  canvas-agent-message-list.tsx       # render list saja
  canvas-agent-composer.tsx           # input/submit saja
  canvas-agent-history-menu.tsx       # history menu saja
  canvas-agent-proposal-list.tsx      # proposal render/action saja
  canvas-agent-run-errors.tsx         # failed/running state saja
```

Aturan struktur:

- Satu file maksimal memegang satu concern utama. Jika file mulai mengurus UI, network, cache patch, dan Excalidraw API sekaligus, pecah.
- Hook boleh tahu TanStack Query dan API client. Komponen presentasional tidak boleh tahu query key.
- Stream helper boleh tahu format SSE. Ia tidak boleh tahu detail DOM, toast, atau Excalidraw API.
- `canvas-client.tsx` tetap owner scene. Agent chat hanya membaca `apiRef` untuk `collectFrameRefs` dan apply proposal.
- Helper yang dipakai frontend dan backend tidak boleh dibuat dengan import lintas package sembarang. Jika butuh shared type, buat boundary yang eksplisit.

### Catatan Backend SSE Supaya Tidak Berantakan

- Daftarkan route baru di `backend/src/index.ts` dekat route API lain, sebelum static upload, dengan prefix jelas seperti `/api/canvas-agent`.
- Auth harus memakai mekanisme yang setara dengan `authenticatedProcedure`; jangan percaya `workflowId` dari client tanpa cek ownership user.
- Buat encoder event kecil, misalnya `writeSseEvent(controller, event)`, supaya format SSE tidak tersebar di banyak tempat.
- Tambahkan event union typed, misalnya `CanvasAgentStreamEvent`, supaya `assistant_delta`, `run_failed`, dan event final tidak stringly-typed.
- Gunakan `AbortSignal` dari request untuk berhenti saat client disconnect.
- Jika provider belum punya token streaming, boleh stream chunk hasil final sebagai fase antara, tetapi dokumenkan sebagai temporary fallback dan jangan pura-pura token-level streaming sudah selesai.
- Run lifecycle harus tetap tercatat di tabel `canvas_agent_runs`: `pending` -> `running` -> `succeeded` atau `failed`.
- Assistant message final harus tetap masuk `canvas_agent_messages`; SSE bukan storage.
- Proposal final harus tetap masuk `canvas_agent_proposals`; SSE hanya mempercepat UI update.

### Catatan TanStack Query Supaya Maintainable

- Query keys harus dibuat dari satu module, bukan array manual tersebar di komponen.
- Optimistic message wajib punya `clientMessageId` atau id lokal stabil agar tidak duplicate saat final event datang.
- Draft assistant message wajib punya `runId` atau `streamId`, lalu diganti oleh final `assistant_message`.
- `messages` sebaiknya menjadi infinite query sebelum history makin panjang.
- `workflows` tidak boleh refetch pada setiap delta. Update `updatedAt` setelah event final atau invalidasi sekali saat run selesai.
- `scene` query harus terpisah dan disabled/lazy. Jangan auto-refetch scene ketika chat stream berjalan.
- Error stream harus patch `runs(workflowId)`, bukan hanya `toast.error`, agar panel tetap punya state yang bisa diretry.

### Checklist Anti Code Sampah per Fase

Setiap fase hanya boleh selesai jika:

- Tidak ada komponen lama dan baru yang merender feature yang sama.
- Tidak ada query hook lama yang masih dipanggil diam-diam untuk data yang sudah dipindah.
- Tidak ada TODO generik seperti `TODO: cleanup later`; tulis issue konkret atau selesaikan langsung.
- Tidak ada `console.log` debug stream tertinggal.
- Tidak ada file baru tanpa import/pemakai.
- Tidak ada endpoint yang dibuat tetapi tidak dipasang ke router/server.
- Tidak ada type `any` untuk event SSE, proposal change, message, run, atau workflow jika type lama sudah tersedia.
- `git diff -- docs frontend backend` harus bisa dibaca sebagai perubahan bertahap, bukan rewrite acak.

### Urutan Aman untuk AI Agent Berikutnya

1. Refactor struktur UI tanpa mengubah behavior.
2. Samakan workflow picker dan agent panel ke hook workflow yang sama.
3. Tambahkan query key contract dan cache patch helper.
4. Tambahkan SSE endpoint dengan runner helper bersama.
5. Tambahkan stream hook dan gunakan di composer.
6. Matikan polling setelah stream event final terbukti mengupdate cache.
7. Hapus jalur lama yang sudah tidak dipakai.
8. Baru mulai migrasi TanStack Start untuk route `/canvas`.

## Keputusan Arsitektur

### 1. Gunakan TanStack Start sebagai app shell baru

TanStack Start wajib menjadi arah framework karena kebutuhan agent chat cocok dengan SSR, streaming, server functions, server routes, bundling Vite, dan TanStack Router.

Namun `/canvas` harus diperlakukan sebagai interactive tool surface:

- Route shell boleh SSR untuk layout, auth bootstrap, dan metadata.
- Area Excalidraw harus tetap client-only atau selective SSR disabled karena bergantung browser APIs.
- Agent chat panel boleh memakai SSR untuk initial workflow/history bila aman, lalu streaming dan interaksi tetap client-driven.

Rekomendasi migrasi:

- Fase awal: buat branch migrasi TanStack Start berdampingan dengan Next.js sampai `/canvas` parity tercapai.
- Fase final: pindahkan route `/canvas` ke TanStack Start, lalu kurangi Next.js hanya jika seluruh route portfolio/admin siap ikut dipindah.

### 2. Gunakan TanStack Query sebagai source of truth client cache

Semua data agent chat harus punya query key eksplisit:

```ts
export const canvasAgentKeys = {
  all: ["canvasAgent"] as const,
  workflows: () => [...canvasAgentKeys.all, "workflows"] as const,
  workflow: (id: number) => [...canvasAgentKeys.all, "workflow", id] as const,
  messages: (workflowId: number) =>
    [...canvasAgentKeys.workflow(workflowId), "messages"] as const,
  runs: (workflowId: number) =>
    [...canvasAgentKeys.workflow(workflowId), "runs"] as const,
  proposals: (workflowId: number) =>
    [...canvasAgentKeys.workflow(workflowId), "proposals"] as const,
  scene: (workflowId: number) =>
    [...canvasAgentKeys.workflow(workflowId), "scene"] as const,
};
```

Prinsip:

- `workflows` untuk daftar history ringan.
- `workflow` untuk metadata workflow aktif.
- `messages` dibuat paginated/infinite query.
- `runs` untuk status run dan retry state.
- `proposals` untuk approval/apply state.
- `scene` tetap lazy loaded dan tidak ikut invalidation chat biasa.

### 3. SSE untuk event streaming, bukan untuk semua data

SSE hanya membawa event real-time. Data final tetap disimpan di database dan disinkronkan ke TanStack Query.

Endpoint target:

```txt
POST /api/canvas-agent/workflows/:workflowId/messages
GET  /api/canvas-agent/workflows/:workflowId/runs/:runId/events
```

Alternatif yang lebih praktis:

```txt
POST /api/canvas-agent/workflows/:workflowId/messages/stream
```

Endpoint `messages/stream` langsung membuat user message, membuat run, menjalankan AI, dan mengirim SSE dalam satu koneksi. Ini paling cocok untuk UX chat karena request submit dan stream response berada dalam satu lifecycle.

Event SSE minimal:

```txt
event: user_message
data: {"message": {...}}

event: run_started
data: {"run": {...}}

event: assistant_delta
data: {"runId": 10, "delta": "text chunk"}

event: assistant_message
data: {"message": {...}}

event: proposal_created
data: {"proposal": {...}}

event: run_completed
data: {"run": {...}}

event: run_failed
data: {"run": {...}, "errorMessage": "..."}
```

Aturan penting:

- `assistant_delta` hanya untuk rendering sementara.
- `assistant_message` adalah data final yang masuk cache dan database.
- Jika koneksi putus, frontend refetch `messages`, `runs`, dan `proposals`.
- Jangan stream `sceneData`; scene tetap endpoint terpisah.

### 4. Server function dan server route boundary

Gunakan server functions untuk operasi typed RPC yang tidak streaming:

- `listWorkflows`
- `getWorkflow`
- `getWorkflowMessages`
- `getWorkflowScene`
- `createWorkflow`
- `updateWorkflow`
- `saveWorkflowScene`
- `deleteWorkflow`
- `updateProposalStatus`
- `retryRun`

Gunakan server route/API route untuk SSE:

- `streamCanvasAgentMessage`

Alasan:

- TanStack Start server functions bagus untuk typed request-response dan bisa stream typed data.
- SSE butuh header dan lifecycle response yang jelas: `text/event-stream`, heartbeat, abort handling, auth, dan cleanup.
- Jika typed `ReadableStream` TanStack Start cukup stabil untuk kebutuhan ini, SSE endpoint bisa tetap dibungkus sebagai server function yang mengembalikan stream. Bila perlu kompatibilitas EventSource standar, pakai server route.

## Data Flow Target

### Submit chat

1. User mengetik prompt di agent composer.
2. UI mengambil `workflowId` aktif atau membuat workflow baru.
3. UI mengumpulkan `frameRefs` dari Excalidraw berdasarkan mention `@frame`.
4. `useMutation` membuat optimistic user message di `messages(workflowId)`.
5. Client membuka stream ke endpoint SSE.
6. Event `assistant_delta` menambah draft assistant message sementara.
7. Event `assistant_message` mengganti draft menjadi final message.
8. Event `proposal_created` memasukkan proposal ke cache.
9. Event `run_completed` mengubah run status dan invalidasi ringan `workflows`.

### Retry run

1. User klik retry pada failed run.
2. `useMutation` update run cache menjadi `pending`.
3. Client membuka stream untuk run retry.
4. Jika sukses, cache messages/proposals/runs diperbarui dari event final.
5. Jika gagal, rollback status run dan tampilkan error state di panel.

### Switch workflow

1. User memilih workflow dari history.
2. `activeWorkflowId` berubah melalui TanStack Router search param atau route state.
3. Query `workflow`, `messages`, `runs`, dan `proposals` aktif untuk workflow baru.
4. Query `scene` lazy fetch hanya saat canvas perlu load scene.
5. Prefetch workflow detail saat hover/focus history item untuk pindah workflow yang terasa instan.

## Refactor File Target

Struktur TanStack Start yang disarankan:

```txt
frontend-start/
  src/
    routes/
      __root.tsx
      canvas.tsx
    features/
      canvas-agent/
        api/
          keys.ts
          server-functions.ts
          stream.ts
        hooks/
          use-canvas-agent-chat.ts
          use-canvas-agent-workflows.ts
          use-canvas-agent-stream.ts
        components/
          canvas-agent-panel.tsx
          canvas-agent-message-list.tsx
          canvas-agent-composer.tsx
          canvas-agent-history-menu.tsx
          canvas-agent-proposal-list.tsx
          canvas-agent-run-errors.tsx
        types.ts
    features/
      canvas/
        canvas-client.tsx
        canvas-workflow-context.tsx
```

Jika refactor masih dilakukan di Next.js sementara:

```txt
frontend/src/app/canvas/
  canvas-agent-panel.tsx              # container tipis
  canvas-agent-query-keys.ts          # query key contract
  canvas-agent-stream.ts              # SSE client helper
  canvas-agent-hooks.ts               # TanStack Query hooks
  canvas-agent-message-list.tsx
  canvas-agent-composer.tsx
  canvas-agent-history-menu.tsx
  canvas-agent-proposal-list.tsx
```

Backend target:

```txt
backend/src/routes/canvas-agent-stream.ts
backend/src/lib/canvas-agent-stream-runner.ts
backend/src/lib/canvas-agent-runner.ts
backend/src/trpc/routers/canvas-agent.ts
```

Untuk TanStack Start final, backend agent routes bisa dipindahkan ke server functions/server routes, tetapi database schema dan runner logic tetap bisa dipertahankan.

## Rundown Implementasi

Implementasi wajib mengikuti jalur **SSE-first di repo sekarang**:

- Fase 0-4 dikerjakan di current Next.js/Hono structure: `frontend/src/app/canvas` dan `backend/src`.
- TanStack Start tetap menjadi arah akhir, tetapi tidak menjadi fase pertama.
- TanStack Start baru disentuh setelah stream, cache update, cleanup old path, dan validasi `/canvas` stabil.

### Fase 0 - Audit dan kontrak

Tujuan: mengunci kontrak sebelum pindah framework.

Checklist:

- Audit semua endpoint `canvasAgent` yang dipakai `/canvas`.
- Tulis type bersama untuk `Workflow`, `Message`, `Run`, `Proposal`, `FrameRef`, dan `ProposalChange`.
- Pisahkan query key contract.
- Tentukan event SSE final.
- Pastikan scene canvas tetap dipisah dari chat detail.

Output:

- `canvas-agent-query-keys.ts`
- `canvas-agent-types.ts`
- kontrak event SSE terdokumentasi

Validasi:

- `pnpm --dir frontend lint`
- `pnpm --dir frontend build`

### Fase 1 - Pecah panel menjadi hook dan komponen kecil

Tujuan: mengurangi risiko refactor SSE dan migrasi TanStack Start nanti tanpa mengubah behavior user-facing.

Checklist:

- Pindahkan fetching workflow/history ke `useCanvasAgentWorkflows`.
- Pindahkan messages/runs/proposals ke `useCanvasAgentChat`.
- Pindahkan optimistic send ke hook.
- Pindahkan UI history ke `CanvasAgentHistoryMenu`.
- Pindahkan composer ke `CanvasAgentComposer`.
- Pindahkan proposal list dan run errors ke komponen sendiri.
- `canvas-agent-panel.tsx` hanya menjadi orchestrator UI.
- Update `Progress Log` setelah split selesai.

Output:

- Panel lebih kecil dan mudah dipindahkan ke TanStack Start.
- Tidak ada perubahan perilaku user-facing.

Validasi:

- Chat lama tetap bisa kirim pesan.
- Workflow create, rename, pin, delete tetap jalan.
- Proposal approve/reject/apply tetap jalan.

### Fase 2 - TanStack Query native layer

Tujuan: menjadikan caching dan optimistic update eksplisit.

Checklist:

- Buat wrapper API function biasa untuk agent data.
- Gunakan `useQuery`, `useInfiniteQuery`, dan `useMutation` langsung dari TanStack Query.
- Pastikan wrapper memakai QueryClient yang sudah ada di `frontend/src/lib/query-client.ts`.
- Messages dibuat pagination atau infinite query.
- Workflow history memakai `staleTime` pendek dan background refetch.
- Optimistic user message memakai `onMutate`.
- Rename/pin/delete workflow update cache langsung.
- Proposal status update memakai optimistic cache patch.
- Hapus polling umum dari panel setelah SSE siap.
- Update `Progress Log` setelah query layer dipakai oleh panel/picker.

Query behavior:

- `workflows`: `staleTime` 10-30 detik, refetch on window focus.
- `messages`: infinite query per workflow, append event dari SSE.
- `runs`: update dari SSE, fallback refetch saat stream disconnect.
- `proposals`: update dari SSE dan mutation.
- `scene`: disabled by default, fetch saat workflow switch/load canvas.

Validasi:

- Tidak ada duplicate message saat mutation selesai.
- Request dedupe terlihat saat switch workflow cepat.
- History workflow update tanpa full reload.

### Fase 3 - Backend SSE endpoint

Tujuan: streaming jawaban AI real-time.

Checklist:

- Tambah Hono route `POST /api/canvas-agent/workflows/:workflowId/messages/stream`.
- Auth endpoint sama ketat dengan tRPC authenticated procedure.
- Endpoint membuat user message, run, lalu mulai stream.
- Jangan panggil `enqueueCanvasAgentRun` untuk message yang sedang diproses oleh stream route.
- Runner menghasilkan token delta atau chunk text.
- Stream mengirim event `assistant_delta` sepanjang AI menjawab.
- Saat final, simpan assistant message ke database.
- Jika ada proposal, simpan proposal dan kirim event `proposal_created`.
- Kirim heartbeat comment setiap 15-25 detik agar koneksi tidak idle.
- Gunakan `AbortSignal` untuk membatalkan proses saat client disconnect.
- Update `Progress Log` dengan detail apakah provider sudah token-level streaming atau masih chunked fallback.

Validasi:

- DevTools network menunjukkan `text/event-stream`.
- Chat assistant muncul bertahap.
- Refresh halaman setelah stream selesai tetap menampilkan message final dari database.
- Disconnect di tengah stream tidak merusak workflow.

### Fase 4 - Streaming client hook

Tujuan: menghubungkan SSE ke TanStack Query cache.

Checklist:

- Buat `useCanvasAgentStream`.
- Saat submit, optimistic user message masuk cache.
- Buat draft assistant message dengan id lokal seperti `stream:${runId}`.
- Tiap `assistant_delta` append ke draft.
- Saat `assistant_message`, replace draft dengan message final.
- Saat `proposal_created`, patch query `proposals(workflowId)`.
- Saat `run_completed`, patch `runs(workflowId)` dan invalidate `workflows`.
- Saat `run_failed`, patch run error dan restore composer input bila perlu.
- Setelah event final terbukti stabil, hapus `setInterval` polling run aktif.
- Update `Progress Log` setelah polling dihapus.

State UI:

- Composer disabled hanya saat submit handshake, bukan sepanjang assistant streaming jika UX ingin user bisa queue prompt.
- Tampilkan stop/cancel jika AbortController sudah tersedia.
- Tampilkan small inline status: `thinking`, `streaming`, `saving`, `failed`.

Validasi:

- Token tidak lompat atau duplicate.
- Scroll tetap nyaman di sidebar Excalidraw.
- Error stream terlihat di panel, bukan hanya toast.

### Fase 5 - Cleanup old path dan hardening

Tujuan: menghapus jalur lama agar tidak ada dua sistem chat yang hidup permanen.

Checklist:

- Hapus polling `setInterval` agent run.
- Hapus fallback mutation lama yang sudah tidak dipakai setelah SSE parity.
- Tambahkan retry policy untuk stream disconnect.
- Tambahkan pagination messages.
- Tambahkan empty/error/loading state yang konsisten dengan PORTO: thin border, icon-only controls, monokrom, compact.
- Tambahkan logging run lifecycle di backend.
- Tambahkan guard rate limit bila endpoint stream mulai dipakai publik.
- Update `Progress Log` dengan daftar fallback yang dihapus.

Validasi akhir SSE-first:

- `pnpm --dir frontend lint`
- `pnpm --dir frontend build`
- Manual test `/canvas`:
  - create workflow
  - send prompt
  - stream response
  - mention frame
  - proposal approve/apply
  - retry failed run
  - switch workflow
  - reload page

### Fase 6 - TanStack Start migration planning

Tujuan: merencanakan dan baru kemudian memindahkan `/canvas` ke stack wajib setelah SSE-first stabil.

Checklist:

- Review ulang dokumentasi TanStack Start terbaru sebelum implementasi migration.
- Scaffold TanStack Start app dengan React, TanStack Router, TanStack Query, Vite.
- Buat route `/canvas`.
- Setup QueryClient provider di root route.
- Setup auth bootstrap dan server context.
- Pindahkan canvas route shell.
- Jadikan Excalidraw island client-only atau selective SSR disabled.
- Pindahkan server functions non-streaming.
- Pindahkan SSE server route.
- Pastikan API backend/database masih sama selama transisi.

Catatan SSR:

- Jangan SSR komponen yang mengakses `window`, Excalidraw API, localStorage, canvas, atau file APIs.
- SSR hanya untuk shell, initial auth, dan data ringan.
- Streaming UI chat terjadi setelah hydration.

Validasi:

- `/canvas` render tanpa hydration error.
- Excalidraw tampil dan interaktif.
- Agent chat streaming berjalan.
- Build TanStack Start sukses.

## Acceptance Criteria

Refactor dianggap selesai jika:

- AI response muncul streaming di panel `/canvas`.
- Tidak ada polling reguler untuk run aktif.
- TanStack Query memegang cache workflow, messages, runs, proposals, dan scene secara terpisah.
- Optimistic user message tidak duplicate setelah response final.
- Stream disconnect punya fallback refetch.
- Proposal yang dibuat AI muncul tanpa refresh.
- Workflow history update otomatis setelah chat selesai.
- Excalidraw tetap stabil, tidak kena SSR browser API error.
- UI tetap mengikuti PORTO: compact, monochrome, thin border, minimal chrome, tidak menjadi dashboard dekoratif.

## Risiko dan Mitigasi

### Risiko: TanStack Start migration terlalu besar

Mitigasi:

- Mulai dari refactor panel dan query layer di app sekarang.
- Baru pindahkan route `/canvas` setelah behavior streaming stabil.

### Risiko: SSE sulit digabung dengan tRPC

Mitigasi:

- Pertahankan tRPC/server functions untuk request-response.
- Buat endpoint streaming khusus untuk chat generation.

### Risiko: message duplicate

Mitigasi:

- Pakai `clientMessageId` untuk optimistic user message.
- Draft assistant memakai `runId`.
- Final message replace draft berdasarkan `runId` atau metadata `streamId`.

### Risiko: scene payload besar

Mitigasi:

- Jangan pernah masukkan `sceneData` ke query workflow/chat.
- Scene tetap lazy query sendiri.

### Risiko: Excalidraw SSR error

Mitigasi:

- Route `/canvas` memakai client-only island untuk editor.
- SSR hanya shell dan data ringan.

## Urutan Prioritas Singkat

1. Pecah `canvas-agent-panel.tsx` menjadi hooks dan komponen kecil.
2. Samakan workflow picker dan agent panel ke hook workflow yang sama.
3. Definisikan TanStack Query keys dan event SSE.
4. Buat SSE endpoint untuk streaming chat.
5. Hubungkan SSE ke cache TanStack Query.
6. Matikan polling run aktif dan hapus fallback lama setelah parity aman.
7. Tambahkan pagination, retry stream, dan hardening.
8. Rencanakan/migrasikan `/canvas` ke TanStack Start dengan Excalidraw client-only setelah current app stabil.
