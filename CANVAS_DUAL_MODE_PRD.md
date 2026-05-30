# PRD: Dual-Mode Canvas (Excalidraw & Docs Focus)

## 1. Overview
Pengembangan ini bertujuan untuk memberikan fleksibilitas kepada user dalam memilih mode kerja di dalam module Canvas. User dapat berpindah antara mode visual sketching (**Excalidraw**) dan mode penulisan dokumen terstruktur (**Docs/Word-like**) menggunakan toggle pemilih mode. 

Dokumen ini telah disesuaikan dengan kondisi source code PORTO saat ini agar dapat langsung diimplementasikan tanpa *hallucinations*.

## 2. Objectives
*   **Dual-View Workspace:** Menyediakan dua mode utama (Canvas & Docs) dalam satu URL `/canvas`.
*   **Contextual Focus:** Memberikan interface yang bersih. Saat mode Docs aktif, UI Excalidraw disembunyikan, dan sebaliknya.
*   **Unified Storage:** Data Canvas (JSON) dan Data Docs (Markdown) disimpan dalam satu *Workflow* yang sama di database.

## 3. Technical Architecture & File Modifications

### 3.1. Database Schema Update
Modifikasi tabel `canvasAgentWorkflows` untuk menyimpan data markdown.
*   **Target File:** `backend/src/db/schema/canvas-agent.ts`
*   **Perubahan:** Tambahkan field `documentData` bertipe `text`.
    ```typescript
    export const canvasAgentWorkflows = pgTable("canvas_agent_workflows", {
      // ... field lama ...
      sceneData: jsonb("scene_data").$type<CanvasAgentSceneData>(),
      documentData: text("document_data").notNull().default(""), // <-- Field baru
      // ...
    });
    ```

### 3.2. Backend API (tRPC) Update
Update router canvas untuk menangani penyimpanan dan pengambilan `documentData`.
*   **Target File:** `backend/src/trpc/routers/canvas-agent.ts`
*   **Perubahan:**
    *   Pada procedure `getWorkflow` dan `listWorkflows`, pastikan `documentData` ikut ter-select (atau biarkan default select all).
    *   Ubah validasi pada `saveWorkflowScene` agar menerima `documentData`, atau buat procedure baru khusus `saveWorkflowDocument` jika ingin debouncing-nya dipisah dari canvas. Disarankan menambah input opsional di `updateWorkflow` atau membuat procedure `saveWorkflowData` gabungan.

### 3.3. Frontend Client Refactoring
Menambahkan state manajemen mode dan UI Switcher pada wrapper utama canvas.
*   **Target File:** `frontend/src/app/canvas/canvas-client.tsx`
*   **Perubahan:**
    *   Tambahkan state: `const [activeMode, setActiveMode] = useState<"canvas" | "docs">("canvas");`
    *   Tambahkan state untuk dokumen: `const [documentContent, setDocumentContent] = useState("");`
    *   Buat UI Toggle (misal: Tabs atau Button Group) di atas `CanvasExcalidraw`.
    *   Gunakan *Conditional Rendering* atau *CSS Display: none* (untuk mencegah Excalidraw re-mount/kehilangan state yang belum tersimpan).
    *   **Penting:** Switcher ini **hanya boleh ditampilkan jika ada workflow yang aktif** (yakni saat `activeWorkflowId !== null`).
        ```tsx
        {/* UI Switcher diletakkan di header atau absolute top */}
        {activeWorkflowId !== null && (
          <div className="canvas-mode-switcher absolute top-4 left-4 z-50 flex gap-2 ...">
            <Button onClick={() => setActiveMode("canvas")} variant={activeMode === "canvas" ? "default" : "outline"}>Canvas</Button>
            <Button onClick={() => setActiveMode("docs")} variant={activeMode === "docs" ? "default" : "outline"}>Docs</Button>
          </div>
        )}

        {/* View Canvas */}
        <div className={cn("h-full w-full", activeMode !== "canvas" && "hidden")}>
           <CanvasExcalidraw ... />
        </div>

        {/* View Docs */}
        {activeMode === "docs" && (
           <div className="h-full w-full overflow-y-auto bg-background p-8">
             <MarkdownEditor value={documentContent} onChange={setDocumentContent} />
           </div>
        )}
        ```

### 3.4. Reusing Markdown Editor
Menggunakan komponen editor yang sudah ada dengan styling yang sesuai.
*   **Target Komponen:** `frontend/src/features/admin/components/markdown-editor.tsx`
*   **Catatan:** Komponen ini sudah menggunakan `@mdxeditor/editor` dan terhubung dengan API upload gambar backend. Komponen ini dapat langsung diimport ke `canvas-client.tsx` (menggunakan `next/dynamic` dengan SSR false).
*   **Tantangan CSS:** Pastikan layout container untuk Editor memiliki tinggi maksimal dan scroll mandiri (`h-full w-full overflow-y-auto`), dengan constraint lebar untuk readability (`max-w-4xl mx-auto`).

## 4. State Sync & Auto-Save Logic
*   **Local Storage:** Buat helper baru di `canvas-storage.ts` (misal: `saveLocalDocument` dan `loadLocalDocument`) agar draf teks tidak hilang saat reload, mirip seperti `saveLocalScene`.
*   **Remote Sync:** Saat fungsi `saveCurrentSceneTo` atau `switchWorkflow` dipanggil di `canvas-client.tsx`, pastikan payload yang dikirim mencakup `documentData: documentContent`.
*   **Load Sync:** Saat `loadWorkflowScene` dipanggil, update state `setDocumentContent(remoteData.documentData || "")`.

## 5. Development Steps (Actionable)
1.  **DB & API:** Update skema Drizzle di `canvas-agent.ts` dan jalankan migrasi. Update router tRPC.
2.  **Storage:** Update fungsi helpers di `frontend/src/app/canvas/canvas-storage.ts`.
3.  **UI Switcher:** Tambahkan toggle button di `CanvasClient`.
4.  **Editor Integration:** Render `MarkdownEditor` secara dinamis di `CanvasClient` berdasarkan state toggle.
5.  **State Wiring:** Hubungkan `onChange` dari editor ke state lokal, dan sinkronkan dengan tRPC auto-save.

## 6. UX Considerations
*   *Performance:* Excalidraw cukup berat. Menyembunyikannya dengan CSS (`hidden` atau `display: none`) lebih baik daripada me-unmount komponennya saat pindah ke Docs mode, agar user tidak perlu menunggu loading kanvas berulang kali.
*   *Styling:* Editor docs harus terlihat seperti lembar kerja editorial PORTO yang bersih, tidak terasa seperti admin form biasa. Hilangkan border tebal jika perlu.
