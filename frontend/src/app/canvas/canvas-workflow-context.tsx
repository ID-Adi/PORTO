"use client";

import { createContext, useContext } from "react";

// Sumber kebenaran tunggal "workflow aktif" yang menyetir BOTH canvas scene
// (canvas-client) dan agent chat (canvas-agent-panel). Disediakan oleh
// canvas-client; dipakai panel agent yang berada di dalam sidebar CanvasPawa.
export type CanvasWorkflowContextValue = {
  activeWorkflowId: number | null;
  // Pindah workflow: auto-save scene aktif → set aktif → muat scene workflow tujuan.
  switchWorkflow: (id: number | null) => Promise<void>;
  // Simpan scene canvas saat ini ke workflow aktif (buat bila belum ada).
  saveActiveScene: () => Promise<void>;
  // Pastikan ada workflow aktif TANPA mengubah scene canvas; bila belum ada,
  // buat baru dan adopsi scene canvas saat ini. Return id workflow aktif.
  ensureWorkflow: (title?: string) => Promise<number>;
  openPicker: () => void;
};

const CanvasWorkflowContext = createContext<CanvasWorkflowContextValue | null>(
  null,
);

export const CanvasWorkflowProvider = CanvasWorkflowContext.Provider;

export function useCanvasWorkflow(): CanvasWorkflowContextValue {
  const ctx = useContext(CanvasWorkflowContext);
  if (!ctx) {
    throw new Error(
      "useCanvasWorkflow harus dipakai di dalam CanvasWorkflowProvider",
    );
  }
  return ctx;
}

const ACTIVE_WORKFLOW_KEY = "porto:canvas:agent-active-workflow:v1";

export function readStoredWorkflowId(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_WORKFLOW_KEY);
    if (!raw) return null;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function persistWorkflowId(id: number | null) {
  if (typeof window === "undefined") return;
  try {
    if (id === null) window.localStorage.removeItem(ACTIVE_WORKFLOW_KEY);
    else window.localStorage.setItem(ACTIVE_WORKFLOW_KEY, String(id));
  } catch {
    // localStorage bisa gagal di private mode — abaikan.
  }
}
