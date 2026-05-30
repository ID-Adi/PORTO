# Task Specification: Dual-Mode Canvas (Excalidraw & Document)

Implement a dual-mode toggle for the Canvas module, allowing users to switch between an Excalidraw whiteboard and a Document editor (MDX/Text) within the same workflow.

## 1. Database & Schema Updates
- **File:** `backend/src/db/schema/canvas-agent.ts`
- **Changes:**
  - Add `canvasMode` column to `canvasAgentWorkflows` table (type: `text`, default: `'excalidraw'`, enum: `['excalidraw', 'document']`).
  - Add `documentData` column to `canvasAgentWorkflows` table (type: `jsonb`, nullable).
- **File:** `backend/src/trpc/routers/canvas-agent.ts`
  - Update `createWorkflow`, `getWorkflow`, and `listWorkflows` to include these new fields.
  - Create a new mutation `updateWorkflowMode` to save the user's preferred mode for that workflow.
  - Update `saveWorkflowScene` or create a new `saveWorkflowDocument` mutation to persist document data.

## 2. Frontend State Management
- **File:** `frontend/src/app/canvas/canvas-workflow-context.tsx`
- **Changes:**
  - Add `canvasMode` and `setCanvasMode` to `CanvasWorkflowContextValue`.
  - Update `switchWorkflow` to fetch and set the correct mode from the workflow data.
- **File:** `frontend/src/app/canvas/canvas-storage.ts`
  - Implement `saveLocalDocument` and `loadLocalDocument` using `localStorage` to mirror the whiteboard's local persistence.

## 3. UI Refactoring
- **File:** `frontend/src/app/canvas/canvas-client.tsx`
  - Refactor to conditionally render `CanvasExcalidraw` or a new `CanvasDocument` component based on `canvasMode`.
  - Ensure the "Save" and "Export" actions are context-aware (saving scene data in excalidraw mode vs. document data in document mode).
- **New File:** `frontend/src/app/canvas/canvas-document.tsx`
  - Implement the Document editor using `@mdxeditor/editor` (already in `package.json`).
  - Style it to match the PORTO aesthetic (monochrome, zinc palette, rigid grid background if applicable).

## 4. Agent Integration (Refinement)
- **File:** `frontend/src/app/canvas/canvas-agent-panel.tsx`
  - Currently, the Agent Panel is a sidebar *inside* Excalidraw. For Document mode, we need to ensure the Agent Panel is accessible.
  - Suggestion: Move the `CanvasAgentPanel` into a shared sidebar container in `CanvasShell` or `CanvasClient` that wraps both editors.

## 5. Implementation Strategy for Claude
1. **Schema First:** Run migrations and update tRPC types.
2. **Context Update:** Enable mode switching in the context provider.
3. **Document Editor:** Create the `CanvasDocument` shell.
4. **Conditional Rendering:** Update `CanvasClient` to swap views.
5. **Logic abstraction:** Ensure `saveActiveScene` and `loadWorkflowScene` handle both data types.

**Safety Check:** Switching modes MUST NOT delete data from the other mode. Each workflow holds both `sceneData` and `documentData` in parallel.
