# Build Error Analysis: tRPC Type Inference Collapse

## 1. Masalah (The Issue)
Proses `pnpm build` gagal pada tahap *type checking* dengan error:
`Property 'canvasAgent' does not exist on type 'RouterOutputs'`.

Error ini muncul di file: `frontend/src/app/canvas/canvas-agent-panel.tsx` pada baris 57.

## 2. Penyebab Utama (Root Cause)
Penyebabnya adalah **"Type Leakage"** dari backend ke frontend. 

Dalam `backend/src/trpc/routers/canvas-agent.ts`, fungsi-fungsi seperti `listWorkflows` dan `getWorkflow` mengembalikan hasil query Drizzle secara langsung (`return db.select().from(...)`).

Saat proses build di Docker:
1. TypeScript di frontend mencoba meng-infer (menebak) tipe data dari `AppRouter`.
2. Drizzle ORM menghasilkan tipe data yang sangat kompleks dan memiliki dependensi internal ke library Drizzle di sisi backend.
3. Karena `frontend/node_modules` dan `backend/node_modules` terpisah di dalam Docker, compiler TypeScript di frontend gagal memproses tipe data Drizzle yang "bocor" tersebut.
4. Hasilnya, seluruh objek `canvasAgent` dianggap `any` atau hilang dari definisi `RouterOutputs`, sehingga menyebabkan build error.

## 3. Bagian Source Code Terkait

### Backend (Sumber Masalah)
**File:** `backend/src/trpc/routers/canvas-agent.ts`
```typescript
// CONTOH KODE BERMASALAH:
listWorkflows: authenticatedProcedure.query(async ({ ctx }) => {
  return db
    .select()
    .from(canvasAgentWorkflows)
    // ...
});
```
*Alasan:* Mengembalikan objek Drizzle mentah yang tipenya terlalu kompleks untuk di-infer oleh frontend secara lintas-paket.

### Frontend (Tempat Error Terdeteksi)
**File:** `frontend/src/app/canvas/canvas-agent-panel.tsx`
```typescript
type RouterOutputs = inferRouterOutputs<AppRouter>;
type WorkflowRow = RouterOutputs["canvasAgent"]["listWorkflows"][number]; // ERROR DI SINI
```
*Alasan:* `RouterOutputs["canvasAgent"]` menjadi `undefined` karena kegagalan inferensi di atas.

## 4. Solusi Rekomendasi (Untuk Claude Code)
Claude Code harus melakukan **Sanitasi Output** pada router tRPC. Jangan mengembalikan objek Drizzle mentah, tapi kembalikan objek plain JavaScript (POJO) yang bersih.

**Contoh Perbaikan di Backend:**
```typescript
listWorkflows: authenticatedProcedure.query(async ({ ctx }) => {
  const rows = await db.select().from(canvasAgentWorkflows)...;
  
  // MAP KE OBJEK BERSIH:
  return rows.map(row => ({
    id: row.id,
    title: row.title,
    status: row.status,
    updatedAt: row.updatedAt,
    // ...kolom lain yang dibutuhkan saja
  }));
});
```

## 5. Instruksi untuk Claude Code
1. Buka `backend/src/trpc/routers/canvas-agent.ts`.
2. Ubah semua query (`listWorkflows`, `getWorkflow`, `createWorkflow`, `updateWorkflow`) agar melakukan `.map()` atau mengembalikan objek literal, bukan hasil `returning()` Drizzle secara langsung.
3. Pastikan properti yang dikembalikan sesuai dengan yang dibutuhkan di `canvas-agent-panel.tsx`.
4. Jalankan `pnpm tsc` di frontend untuk verifikasi perbaikan.
