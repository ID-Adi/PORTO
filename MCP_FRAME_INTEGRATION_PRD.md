# PRD: Intelligent Frame & MCP Integration (PORTO Canvas)

## 1. Overview
Proyek ini bertujuan untuk meningkatkan fungsionalitas **Frame** di Excalidraw dari sekadar kontainer visual menjadi entitas "cerdas" yang terintegrasi penuh dengan **Model Context Protocol (MCP)**. Inspirasi utama adalah integrasi Figma MCP, di mana AI dapat memahami struktur, konteks, dan melakukan manipulasi desain secara presisi di tingkat node/frame.

Dokumen ini telah disesuaikan dengan kondisi source code PORTO saat ini agar dapat langsung diimplementasikan tanpa *hallucinations*.

## 2. Objectives
*   **Context Awareness:** Agent AI dapat membaca detail isi frame yang sedang dikerjakan melalui sinkronisasi database dan MCP.
*   **Precision Editing:** Proposal AI menargetkan modifikasi elemen berdasarkan ID di dalam frame, menghindari perubahan acak.
*   **Data Enrichment:** Merekam metadata ke dalam struktur elemen Excalidraw agar LLM memahami hirarki (contoh: ini adalah frame untuk "header").

## 3. Technical Architecture & File Modifications

### 3.1. Extended Frame Metadata (customData)
Excalidraw memiliki field `customData` pada setiap elemen. Kita akan memanfaatkannya khusus untuk elemen bertipe `frame` (`isFrame(element)`).
*   **Target:** Modifikasi behavior saat user membuat atau mengedit frame di UI (atau biarkan AI yang mengisinya via Proposal).
*   **Struktur Data:**
    ```typescript
    // Representasi logika untuk element.customData
    interface PortoFrameMetadata {
      role?: 'section' | 'component' | 'layout' | 'wireframe';
      description?: string; // Penjelasan frame untuk LLM
      isLockedForAi?: boolean;
    }
    ```

### 3.2. Menyempurnakan `collectFrameRefs` di Frontend
Fungsi `collectFrameRefs` saat ini hanya mengumpulkan `id`, `name`, `mention`, `elementIds`, dan `bounds`. Kita perlu mengekstrak `customData` agar AI mendapat konteks ekstra saat chat dikirim.
*   **Target File:** `frontend/src/app/canvas/canvas-agent-panel.tsx`
*   **Perubahan:** 
    1. Update type `FrameRef` di dalam file tersebut untuk mencakup `customData`.
    2. Pada fungsi `collectFrameRefs`, baca `frame.customData` dan masukkan ke dalam array `refs` yang dikembalikan.

### 3.3. Database Schema Update untuk FrameRef
Karena tipe `FrameRef` di database saat ini belum mencakup `customData`, kita perlu memperbaruinya.
*   **Target File:** `backend/src/db/schema/canvas-agent.ts`
*   **Perubahan:**
    Update `CanvasAgentFrameRef` type definition:
    ```typescript
    export type CanvasAgentFrameRef = {
      id: string;
      name: string | null;
      mention: string;
      elementIds: string[];
      bounds?: { x: number; y: number; width: number; height: number; };
      customData?: Record<string, unknown>; // <-- Field baru
    };
    ```

### 3.4. MCP Server Implementation (The Bridge)
*   **Target Folder:** Buat folder/proyek baru untuk MCP Server (misal: `packages/porto-mcp-server` atau integrasikan ke backend tRPC jika memungkinkan, namun MCP biasanya berjalan sebagai server terpisah yang berkomunikasi via STDIO atau SSE).
*   **Konsep:**
    Karena scene data disimpan di PostgreSQL (`canvas_agent_workflows.sceneData`), MCP Server harus memiliki akses baca ke database ini.
    *   **Resource:** `porto://canvas/workflow/{workflowId}/frame/{frameId}`
        -> Mereturn JSON yang difilter, hanya berisi elemen-elemen yang `frameId`-nya cocok dengan `frameId` yang diminta.
    *   **Tool:** `create_canvas_proposal(workflowId, frameId, changes)`
        -> Ini akan melakukan insert langsung ke tabel `canvas_agent_proposals` menggunakan Drizzle ORM.

## 4. User Experience (UX) - Existing Flow
Alur saat ini sudah sangat baik dan **TIDAK PERLU** banyak diubah secara drastis, hanya ditingkatkan kemampuannya:
1.  **Mention System (@):** Berjalan melalui regex di `extractMentions` pada `canvas-agent-panel.tsx`.
2.  **Inference:** Saat user mengetik `@Header tolong rapikan`, `addMessageMutation` mengirimkan pesan beserta array `FrameRef`.
3.  **Proposal Generation:** Backend LLM (atau MCP Server yang di-invoke LLM) memproses `FrameRef` dan membuat `CanvasAgentProposal`.
4.  **Application:** Komponen `ProposalItem` memiliki tombol "Apply" yang memanggil `applyProposalChanges` untuk melakukan *patching* atau penambahan elemen via `CaptureUpdateAction.IMMEDIATELY`.

## 5. Development Steps (Actionable)
1.  **DB Types:** Update `CanvasAgentFrameRef` di `backend/src/db/schema/canvas-agent.ts` untuk mengakomodasi `customData`.
2.  **Frontend Extraction:** Update `collectFrameRefs` di `canvas-agent-panel.tsx` agar menyertakan `customData` dari frame element.
3.  **LLM Prompting:** Pada sistem yang meng-handle `saveAssistantMessage` (di backend LLM Anda), instruksikan model untuk merespons dengan memodifikasi `customData` jika perlu (misal: memberi nama role pada frame).
4.  **MCP Server Setup:** Buat skeleton project untuk MCP Server yang terhubung ke instance PostgreSQL yang sama, lalu definisikan *Resource* pembacaan elemen frame.
