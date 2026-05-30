# Canvas Module Guidelines

Guidelines for developing and maintaining the Canvas module in PORTO.

## Architecture Overview

The Canvas module is built around **CanvasPawa**, integrated as a React component. It serves as a whiteboard for visual sketching and notes, but also as a "live" environment for AI agent interaction.

### Core Components
- `CanvasClient`: The "orchestrator" that manages state, synchronization, and workflow transitions.
- `CanvasExcalidraw`: A wrapper for the CanvasPawa component, handling theme, asset paths, and UI overlays.
- `CanvasShell`: The main layout wrapper for the canvas page.
- `CanvasWorkflowProvider`: Context provider for managing active workflows and agent state.

## State Management & Synchronization

The canvas state (scene data) is managed at two levels:

1.  **Local (Draft):** Managed via `canvas-storage.ts` and `canvas-files-store.ts`. Used for immediate persistence and offline recovery.
2.  **Remote (Workflow):** Managed via tRPC `canvasAgent` router. Each "Workflow" has its own `sceneData` containing elements, appState, and files.

### Synchronization Rules
- Changes on the canvas are auto-saved to **Local** state with a debounced timer.
- Saving to **Remote** (Cloud) is explicit (via "Save" button) or triggered during workflow switches.
- `slimAppState`: When saving to the database, only a subset of `AppState` is persisted (colors, zoom, scroll, etc.) to keep the payload efficient.

## AI Agent & MCP Integration

The Canvas is designed to be "Agent-aware" (see `MCP_FRAME_INTEGRATION_PRD.md`).

- **Frames as Resources:** AI agents should treat CanvasPawa Frames as distinct resources (`porto://canvas/frame/{id}`).
- **Proposals:** Instead of directly editing the live canvas, agents generate `CanvasAgentProposal` objects. Users then "Apply" these proposals to update the state via the `apiRef`.
- **Custom Data:** Use `element.customData` to store metadata for AI tools (e.g., `role`, `description`, `isLockedForAi`).

## Development Conventions

- **Asset Path:** Always ensure `EXCALIDRAW_ASSET_PATH` is set to `/excalidraw-assets/` for self-hosted static assets.
- **API Ref:** Interaction with the canvas state from outside the component must go through the `apiRef` (ExcalidrawImperativeAPI).
- **Video Integration:** Elements with `customData.kind === 'video'` are handled specifically by the `canvas-video-sidebar` and `canvas-video.ts`.
- **Theming:** Sync the CanvasPawa theme with `next-themes`. Use `transparent` background for the canvas to allow the site's background patterns to show through if intended.

## Workflow Actions
- **switchWorkflow:** Handles the transition between different canvas scenes. It should always attempt a "best-effort" save of the current scene before loading the new one.
- **loadWorkflowScene:** Fetches and applies remote state to the canvas, overwriting local drafts for that session.
