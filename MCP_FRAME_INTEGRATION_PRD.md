# PRD: PORTO MCP Platform - Admin, Tools, Canvas

## 1. Overview

Dokumen ini memperluas rencana awal **Intelligent Frame & MCP Integration** menjadi rencana platform MCP untuk PORTO. Scope V1 tidak lagi hanya frame di `/canvas`, tetapi mencakup tiga domain yang setara:

1. **Admin Blog**: membantu pembuatan draft, struktur artikel, metadata, slug, dan proposal publish.
2. **Tools Generate Image**: menghubungkan agent dengan pipeline generate image yang saat ini sudah berjalan lewat N8N dan `tool_generation`.
3. **Canvas Frame**: membuat frame Excalidraw menjadi konteks yang dapat dibaca, diperkaya, dan ditargetkan oleh agent lewat proposal yang aman.

Tujuannya bukan membuat AI bisa mengubah semua data PORTO secara langsung, tetapi membuat layer MCP yang terstruktur, dapat diaudit, dan tetap memakai pola **draft/proposal/approval** untuk operasi yang mengubah data atau memanggil proses mahal.

Dokumen ini disesuaikan dengan kondisi repo saat ini:

- `frontend/` memakai Next.js, TypeScript, Tailwind CSS, shadcn/ui, Radix UI, dan Lucide.
- `backend/` memakai Hono, tRPC, Drizzle ORM, Better Auth, upload route, router blog, router tools, dan canvas agent.
- Admin blog sudah tersedia melalui `trpc.blog`.
- Generate image sudah tersedia melalui `trpc.tools.generateImage` dan disimpan di `tool_generation`.
- Canvas agent sudah memiliki workflow, message, proposal, run, dan `sceneData` di `canvas_agent_workflows`.

## 2. Product Goals

### 2.1. Tujuan Utama

- **Unified MCP Layer**: menyediakan satu layer MCP untuk membaca konteks PORTO dan mengajukan aksi lintas domain.
- **Equal V1 Domains**: Blog, Tools Image, dan Canvas diperlakukan sebagai domain V1 yang sama penting.
- **Human-in-the-loop**: semua aksi mutasi harus melewati draft, proposal, atau approval sebelum memengaruhi konten publik, memanggil N8N, atau mengubah canvas.
- **Repo-native Implementation**: MCP server hidup di backend PORTO terlebih dahulu, bukan package terpisah, supaya bisa memakai auth, database, service, dan business rule yang sudah ada.
- **Agent-friendly Context**: agent dapat membaca post, history image, workflow canvas, dan frame tertentu lewat resource MCP yang jelas.

### 2.2. Non-goals V1

- Tidak membuat agent bebas publish blog tanpa approval admin.
- Tidak membuat agent bebas generate image langsung dari remote MCP tanpa approval eksplisit.
- Tidak mengganti flow proposal canvas yang sudah ada.
- Tidak memindahkan semua logic tRPC ke MCP; MCP menjadi adapter/entry point, bukan pengganti API internal.
- Tidak membuat marketplace/plugin MCP publik sebelum auth, audit, dan permission boundary stabil.

## 3. MCP Architecture

### 3.1. Transport Strategy

Gunakan model **hybrid**:

1. **Streamable HTTP** untuk admin/dashboard dan remote MCP client.
   - Endpoint target: `POST/GET /api/mcp`.
   - Cocok untuk client remote yang perlu akses dashboard/admin.
   - Wajib memakai admin auth, origin validation, host validation, dan audit log.

2. **stdio** untuk local agent/dev workflow.
   - Entrypoint target: `backend/src/mcp/stdio.ts`.
   - Cocok untuk Codex/Claude Desktop/local MCP client.
   - Reuse registry yang sama dengan HTTP server agar tool/resource contract tidak bercabang.

Catatan dokumentasi MCP terbaru:

- MCP memakai JSON-RPC dan mendukung dua transport utama: `stdio` dan `Streamable HTTP`.
- Streamable HTTP menggantikan HTTP+SSE lama untuk remote server.
- `stdio` cocok untuk client yang menjalankan server sebagai subprocess lokal.
- Untuk HTTP transport, server harus menjaga origin/host validation, auth, dan session handling.
- Tool yang mengubah data sebaiknya memiliki human-in-the-loop, terutama untuk aksi sensitif.

Rujukan:

- `https://modelcontextprotocol.io/specification/2025-06-18/basic/transports`
- `https://modelcontextprotocol.io/specification/2025-06-18/server/tools`
- `https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization`
- `https://github.com/modelcontextprotocol/typescript-sdk`

### 3.2. SDK Choice

Gunakan MCP TypeScript SDK production line **v1.x** saat implementasi awal, kecuali implementer memverifikasi bahwa v2 sudah stabil untuk production pada waktu implementasi.

Alasan:

- Repo PORTO sudah TypeScript end-to-end.
- Backend sudah berjalan di Node/Hono.
- MCP TypeScript SDK menyediakan server primitives untuk tools, resources, prompts, `stdio`, dan Streamable HTTP.
- v1.x saat rencana ini dibuat masih jalur production yang lebih aman; v2 masih perlu diverifikasi status stabilnya sebelum dipakai.

### 3.3. Backend Ownership

Backend menjadi pemilik MCP server logic karena:

- Auth admin dan session sudah ada di backend.
- Drizzle schema dan DB connection sudah ada di backend.
- Blog CRUD sudah ada di `backend/src/trpc/routers/blog.ts`.
- Generate image sudah ada di `backend/src/trpc/routers/tools.ts`.
- Canvas workflow/proposal sudah ada di `backend/src/trpc/routers/canvas-agent.ts` dan runner terkait.
- Upload dan public URL helper sudah ada di backend.

MCP tidak boleh menduplikasi business logic besar. Jika tool MCP perlu create blog, generate image, atau create canvas proposal, logic inti harus diekstrak menjadi service reusable lalu dipakai ulang oleh tRPC dan MCP.

## 4. Domain Scope

### 4.1. Admin Blog Domain

Admin Blog MCP membantu workflow pembuatan artikel, bukan menggantikan admin editor.

Kemampuan V1:

- Membaca daftar post.
- Membaca detail post.
- Menyiapkan draft markdown berdasarkan prompt/outline.
- Mengajukan proposal create post.
- Mengajukan proposal update post.
- Mengajukan proposal publish/unpublish.
- Menghubungkan cover image dari media library atau hasil generate image yang sudah disetujui.

Behavior mutasi:

- `blog_prepare_draft` hanya menghasilkan structured draft, belum menyentuh DB.
- `blog_propose_create` membuat row approval `mcp_action_requests`, bukan langsung insert `blog_posts`.
- Setelah admin approve, backend membuat post sebagai draft/unpublished.
- `blog_propose_publish` tidak boleh publish langsung; admin harus approve.

### 4.2. Tools Generate Image Domain

Tools Image MCP menghubungkan agent dengan pipeline image yang sudah ada di `/tools`.

Kemampuan V1:

- Membaca history image milik user/admin yang relevan.
- Membaca detail image generation.
- Mengajukan prompt generate image.
- Mengajukan reference image list dan aspect ratio.
- Setelah approval, menjalankan logic generate image yang sama dengan `trpc.tools.generateImage`.
- Mengembalikan resource link ke hasil image setelah generation selesai.

Behavior mutasi:

- `image_propose_generation` hanya membuat request pending.
- `image_generate_after_approval` hanya boleh dipanggil oleh sistem/admin setelah approval.
- Panggilan ke N8N tidak boleh terjadi saat proposal dibuat.
- Output tetap masuk ke `tool_generation`, bukan ke `media`, kecuali ada approval lanjutan untuk memasukkan ke library admin.

### 4.3. Canvas Frame Domain

Canvas MCP mempertahankan rencana awal, tetapi masuk sebagai salah satu domain dalam platform MCP.

Kemampuan V1:

- Membaca daftar workflow canvas.
- Membaca scene data workflow.
- Membaca frame tertentu beserta elemen di dalamnya.
- Membaca dan mengirim `customData` frame sebagai metadata agent.
- Mengajukan proposal perubahan canvas.
- Mengajukan enrichment metadata frame.

Behavior mutasi:

- `canvas_read_frame` read-only.
- `canvas_enrich_frame_metadata` membuat proposal update `customData`, bukan langsung mengubah scene.
- `canvas_create_proposal` membuat row proposal yang tetap muncul di flow canvas proposal.
- Apply/reject tetap dilakukan oleh user melalui UI canvas yang sudah ada.

## 5. MCP Resource Contract

### 5.1. Resources

Resources harus read-only dan aman dipanggil berulang.

| URI | Domain | Isi |
| --- | --- | --- |
| `porto://admin/blog/posts` | Blog | Daftar post ringkas: id, title, slug, published, publishedAt, updatedAt |
| `porto://admin/blog/post/{id}` | Blog | Detail post: title, slug, description, content, meta, coverUrl, status |
| `porto://tools/images/history` | Tools Image | History image terbaru dari `tool_generation` dengan `kind = "image"` |
| `porto://tools/images/{id}` | Tools Image | Detail image generation, prompt, aspect ratio, status, fileUrl, references |
| `porto://canvas/workflow/{workflowId}` | Canvas | Workflow, metadata, activeFrameIds, scene summary |
| `porto://canvas/workflow/{workflowId}/frame/{frameId}` | Canvas | Frame, bounds, customData, elementIds, dan elemen dalam frame |

### 5.2. Resource Output Rules

- Output JSON harus ringkas dan predictable.
- Jangan menyisipkan file binary besar langsung ke response resource.
- Untuk image, return URL/resource link, bukan base64.
- Untuk canvas scene besar, resource frame harus memfilter elemen hanya untuk frame terkait.
- Data private hanya boleh keluar jika caller authorized.

## 6. MCP Tool Contract

### 6.1. Tools

| Tool | Domain | Mode | Deskripsi |
| --- | --- | --- | --- |
| `blog_prepare_draft` | Blog | read/compute | Membuat draft markdown, slug, description, dan meta dari prompt |
| `blog_propose_create` | Blog | approval | Membuat approval request untuk post baru |
| `blog_propose_update` | Blog | approval | Membuat approval request untuk perubahan post |
| `blog_propose_publish` | Blog | approval | Membuat approval request untuk publish/unpublish |
| `image_propose_generation` | Tools Image | approval | Membuat request generate image pending |
| `image_generate_after_approval` | Tools Image | mutating/system | Menjalankan generate image setelah approval |
| `canvas_read_frame` | Canvas | read | Membaca frame dan elemen target |
| `canvas_create_proposal` | Canvas | approval | Membuat proposal patch canvas |
| `canvas_enrich_frame_metadata` | Canvas | approval | Mengajukan update `customData` frame |

### 6.2. Tool Safety Rules

- Semua input tool wajib divalidasi dengan schema.
- Tool mutasi harus mencatat request ke `mcp_action_requests`.
- Tool mutasi harus return status proposal, bukan langsung mengubah state final, kecuali tool tersebut hanya dijalankan setelah approval.
- Tool error harus mengembalikan pesan aman untuk agent dan menyimpan detail teknis di log server.
- Tool yang memanggil N8N harus memiliki timeout, status tracking, dan error message yang bisa dibaca admin.
- Tool destructive harus ditandai destructive/idempotent hint sesuai dukungan SDK yang dipakai.

## 7. Data Model

### 7.1. Generic MCP Approval Log

Tambahkan tabel baru:

```typescript
export const mcpActionRequests = pgTable("mcp_action_requests", {
  id: serial("id").primaryKey(),
  domain: text("domain").notNull(), // "blog" | "tools.image" | "canvas"
  action: text("action").notNull(),
  status: text("status").notNull().default("pending"), // pending | approved | rejected | running | succeeded | failed
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  result: jsonb("result").$type<Record<string, unknown>>().notNull().default({}),
  requestedBy: text("requested_by"),
  approvedBy: text("approved_by"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  approvedAt: timestamp("approved_at"),
  completedAt: timestamp("completed_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

Catatan:

- `requestedBy` bisa berisi user id/admin id atau identifier local MCP client.
- `approvedBy` wajib untuk semua aksi mutasi yang dilanjutkan.
- `payload` menyimpan input proposal.
- `result` menyimpan output final seperti `blogPostId`, `toolGenerationId`, atau `canvasProposalId`.

### 7.2. Canvas FrameRef Metadata

Perbarui type backend:

```typescript
export type CanvasAgentFrameRef = {
  id: string;
  name: string | null;
  mention: string;
  elementIds: string[];
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  customData?: Record<string, unknown>;
};
```

Perbarui type frontend:

```typescript
export type FrameRef = {
  id: string;
  name: string | null;
  mention: string;
  elementIds: string[];
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  customData?: Record<string, unknown>;
};
```

Perbarui `collectFrameRefs` di `frontend/src/app/canvas/canvas-agent-utils.ts` agar membaca `frame.customData` dan memasukkannya ke payload.

### 7.3. Canvas Proposal Linkage

`canvas_agent_proposals` tetap menjadi tabel utama untuk proposal patch canvas. Jika proposal berasal dari MCP:

- Simpan `mcpActionRequestId` di `canvas_agent_proposals.metadata` jika metadata field ditambahkan di masa depan, atau
- Simpan linkage di `mcp_action_requests.result.canvasProposalId` untuk V1 tanpa mengubah schema proposal.

Pilihan V1 yang paling kecil risikonya: simpan linkage di `mcp_action_requests.result`.

## 8. Backend Implementation Plan

### 8.1. File Structure

Tambahkan file berikut di backend:

```text
backend/src/mcp/server.ts
backend/src/mcp/registry.ts
backend/src/mcp/domains/blog.ts
backend/src/mcp/domains/tools-image.ts
backend/src/mcp/domains/canvas.ts
backend/src/mcp/stdio.ts
backend/src/routes/mcp.ts
```

### 8.2. Registry Pattern

`registry.ts` menjadi tempat semua domain mendaftarkan resources dan tools.

Konsep:

- `createPortoMcpServer(context)` membuat instance MCP server.
- `registerBlogMcp(server, context)` mendaftarkan blog resources/tools.
- `registerToolsImageMcp(server, context)` mendaftarkan image resources/tools.
- `registerCanvasMcp(server, context)` mendaftarkan canvas resources/tools.
- Context berisi DB, auth/session/admin identity, publicUrl helper, dan service functions.

### 8.3. HTTP Route

`backend/src/routes/mcp.ts`:

- Mount di `/api/mcp`.
- Validasi session melalui Better Auth.
- Wajib admin untuk domain admin/blog dan aksi mutasi.
- Validasi Origin dan Host seperti CORS backend saat ini.
- Untuk local dev, hanya izinkan `localhost` dan `127.0.0.1`.
- Untuk production, izinkan domain `pawa.my.id` dan subdomain yang disetujui.
- Return proper MCP transport response.

Update `backend/src/index.ts`:

```typescript
import { mcpRoute } from "./routes/mcp.js";

app.route("/api/mcp", mcpRoute);
```

### 8.4. stdio Entrypoint

`backend/src/mcp/stdio.ts`:

- Membuat MCP server dari registry yang sama.
- Menggunakan stdio transport.
- Mengambil credential local dari environment.
- Untuk local mutating tools, tetap membuat approval request, bukan bypass approval.

Tambahkan script setelah entrypoint ada:

```json
{
  "scripts": {
    "mcp:stdio": "tsx --env-file=.env src/mcp/stdio.ts"
  }
}
```

### 8.5. Service Extraction

Ekstrak logic yang saat ini terlalu menempel di router:

- Blog service:
  - list posts
  - get post
  - create draft post
  - update post
  - set publish state

- Tools image service:
  - validate image input
  - create pending generation row/request
  - execute N8N image generation after approval
  - map history row with `publicUrl`

- Canvas service:
  - read workflow
  - read frame from sceneData
  - create canvas proposal
  - update/enrich frame metadata through proposal

tRPC router tetap menjadi consumer service, bukan satu-satunya tempat business logic.

## 9. Admin UX

### 9.1. Route

Tambahkan route:

```text
frontend/src/app/(admin)/admin/mcp/page.tsx
```

Tambahkan item nav di:

```text
frontend/src/features/admin/components/admin-shell.tsx
```

Label: `MCP`

Icon: gunakan Lucide, misalnya `PlugZap`, `Network`, atau `Bot`.

### 9.2. Layout

Ikuti bahasa visual PORTO:

- Monokrom/low-saturation.
- Thin borders.
- Dense table.
- Radius kecil.
- Minimal chrome.
- Icon-only atau icon+label bila command perlu jelas.
- Tidak memakai hero marketing.
- Tidak memakai card bertumpuk.

Panel utama:

- MCP status summary.
- Domain toggles/status: Blog, Tools Image, Canvas.
- Tool/resource list.
- Pending approval queue.
- Recent MCP action logs.
- Error state yang bisa discan.

### 9.3. Approval UX

Approval queue harus memperlihatkan:

- Domain.
- Action.
- Requested by.
- Created at.
- Ringkasan payload.
- Risk label: read, draft, mutating, external call.
- Tombol approve/reject.

Behavior:

- Approve blog create/update menjalankan service blog terkait.
- Approve image generation menjalankan N8N generate flow.
- Approve canvas proposal membuat/menautkan proposal canvas, lalu user apply di canvas UI.
- Reject hanya mengubah status request dan menyimpan alasan opsional.

## 10. Canvas-Specific Details

### 10.1. Frame Metadata

Gunakan `element.customData` pada frame untuk metadata agent:

```typescript
type PortoFrameMetadata = {
  role?: "section" | "component" | "layout" | "wireframe" | "blog_block" | "image_prompt_board";
  description?: string;
  isLockedForAi?: boolean;
  linkedBlogPostId?: number;
  linkedToolGenerationId?: number;
};
```

Catatan:

- Jangan rename type/import Excalidraw internal.
- Jangan mengubah technical API Excalidraw hanya untuk branding.
- Metadata harus optional dan backward compatible.

### 10.2. Frame Resource Filtering

`porto://canvas/workflow/{workflowId}/frame/{frameId}` harus:

- Ambil `sceneData` dari workflow.
- Cari frame element dengan `id = frameId`.
- Ambil elemen yang memiliki `frameId`.
- Return frame bounds, name, customData, element count, dan selected element fields yang aman.
- Jangan return seluruh scene jika hanya diminta frame.

### 10.3. Proposal Application

MCP tidak meng-apply patch langsung ke Excalidraw scene.

Flow:

1. MCP tool membuat `mcp_action_requests`.
2. Admin/user approve request.
3. Backend membuat `canvas_agent_proposals`.
4. Canvas UI menampilkan proposal.
5. User apply/reject proposal dari UI canvas.

## 11. Security, Auth, and Audit

### 11.1. Auth Rules

- Anonymous request ke `/api/mcp` harus ditolak.
- Non-admin request ke admin/blog MCP tools harus ditolak.
- `stdio` local tetap harus memakai environment yang jelas dan tidak boleh bypass approval.
- Token/session tidak boleh dikirim lewat query string.

### 11.2. Permission Rules

- Blog read/write: admin only.
- Tools image history: scope by user, kecuali admin dashboard memang butuh all-users view.
- Tools image generate: approval required.
- Canvas workflow: scope by workflow owner/admin.
- Canvas proposal: approval required.

### 11.3. Audit Rules

Semua tool call mutating wajib mencatat:

- domain
- action
- caller/requestedBy
- payload summary
- status transition
- approvedBy
- result id
- errorMessage bila gagal

Audit log harus cukup jelas untuk debugging tanpa menyimpan secret atau base64 besar.

## 12. Implementation Phases

### Phase 1 - PRD and Type Alignment

- Finalisasi PRD ini.
- Tambahkan `customData` ke `CanvasAgentFrameRef` backend dan `FrameRef` frontend.
- Update `collectFrameRefs` agar membawa `customData`.
- Tambahkan schema `mcp_action_requests`.
- Generate migration Drizzle.

### Phase 2 - Backend MCP Skeleton

- Tambahkan MCP dependencies setelah versi SDK dipilih.
- Buat `server.ts`, `registry.ts`, dan domain module kosong.
- Buat `stdio.ts` dan script `mcp:stdio`.
- Buat `routes/mcp.ts` dan mount `/api/mcp`.
- Smoke test MCP server dengan satu read-only resource sederhana.

### Phase 3 - Blog Domain

- Ekstrak blog service dari router.
- Implement blog resources.
- Implement `blog_prepare_draft`.
- Implement proposal tools untuk create/update/publish.
- Tambahkan approval handling untuk blog action.

### Phase 4 - Tools Image Domain

- Ekstrak generate image service dari router.
- Implement image history resources.
- Implement `image_propose_generation`.
- Implement approval execution yang memanggil pipeline N8N setelah approve.
- Pastikan output tetap tercatat di `tool_generation`.

### Phase 5 - Canvas Domain

- Implement workflow/frame resources.
- Implement frame filtering dari `sceneData`.
- Implement `canvas_create_proposal`.
- Implement `canvas_enrich_frame_metadata`.
- Pastikan proposal tetap muncul dan di-apply melalui UI canvas.

### Phase 6 - Admin MCP Dashboard

- Tambahkan `/admin/mcp`.
- Tambahkan nav item.
- Tampilkan MCP domains, tools/resources, approval queue, action log, dan error state.
- Implement approve/reject untuk `mcp_action_requests`.

## 13. Test Plan

### 13.1. Static Checks

- `pnpm --dir frontend lint`
- `pnpm --dir frontend build`
- Backend TypeScript validation/build command setelah tersedia.
- Drizzle migration generation/check untuk schema baru.

### 13.2. MCP Smoke Tests

- Jalankan stdio MCP server dari backend.
- Verifikasi MCP client dapat list tools/resources.
- Verifikasi resource blog list bisa dibaca oleh admin/local authorized context.
- Verifikasi anonymous/non-admin HTTP request ke `/api/mcp` gagal.
- Verifikasi `/api/mcp` menerima request dari origin yang diizinkan.

### 13.3. Approval Scenarios

- Blog create proposal menghasilkan `mcp_action_requests.status = "pending"` dan tidak membuat post published.
- Blog publish proposal tidak mengubah `published` sebelum approve.
- Image proposal tidak memanggil N8N sebelum approve.
- Image approval memanggil generate flow dan membuat row `tool_generation`.
- Canvas proposal menargetkan frame id yang benar.
- Canvas metadata enrichment membuat proposal, bukan patch langsung.

### 13.4. Regression Checks

- Existing admin blog CRUD tetap berjalan.
- Existing `/tools` generate image tetap berjalan.
- Existing `/canvas` chat/proposal flow tetap berjalan.
- Existing `trpc.tools.listMyHistory({ kind: "image" })` tetap mengembalikan history image.

## 14. Acceptance Criteria

V1 dianggap berhasil jika:

- Ada MCP server skeleton dengan registry yang sama untuk HTTP dan stdio.
- Blog, Tools Image, dan Canvas minimal punya satu resource read-only yang berjalan.
- Semua mutating tools membuat approval request.
- Admin bisa melihat pending MCP action dari `/admin/mcp`.
- Approve/reject action tercatat dan dapat diaudit.
- Canvas frame refs membawa `customData`.
- Tidak ada mutasi diam-diam tanpa approval.

## 15. Open Questions

- Apakah `/api/mcp` akan dipakai oleh client eksternal selain admin internal?
- Apakah admin ingin melihat image history semua user atau hanya milik admin saat dipakai untuk blog cover?
- Apakah MCP approval queue perlu realtime/SSE, atau polling tRPC cukup untuk V1?
- Apakah `mcp_action_requests` perlu menyimpan snapshot markdown diff untuk blog update, atau cukup payload structured JSON di V1?

Default V1:

- Treat `/api/mcp` sebagai internal/admin endpoint.
- Tampilkan image history milik admin terlebih dahulu.
- Gunakan polling tRPC untuk approval queue.
- Simpan payload structured JSON dulu, diff UI bisa masuk iterasi berikutnya.
