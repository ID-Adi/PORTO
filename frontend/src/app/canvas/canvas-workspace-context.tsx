"use client";

import { createContext, useContext } from "react";

// Sumber kebenaran tunggal "workspace aktif" yang menyetir canvas scene.
// Agent chat memakai id yang sama sebagai thread scope, tetapi state chat tidak
// disimpan di context ini.
export type CanvasWorkspaceContextValue = {
  activeWorkspaceId: number | null;
  // Pindah workspace: auto-save scene aktif → set aktif → muat scene tujuan.
  switchWorkspace: (id: number | null) => Promise<void>;
  // Simpan scene canvas saat ini ke workspace aktif (buat bila belum ada).
  saveActiveScene: () => Promise<void>;
  // Pastikan ada workspace aktif TANPA mengubah scene canvas; bila belum ada,
  // buat baru dan adopsi scene canvas saat ini. Return id workspace aktif.
  ensureWorkspace: (title?: string) => Promise<number>;
  openPicker: () => void;
};

const CanvasWorkspaceContext = createContext<CanvasWorkspaceContextValue | null>(
  null,
);

export const CanvasWorkspaceProvider = CanvasWorkspaceContext.Provider;

export function useCanvasWorkspace(): CanvasWorkspaceContextValue {
  const ctx = useContext(CanvasWorkspaceContext);
  if (!ctx) {
    throw new Error(
      "useCanvasWorkspace harus dipakai di dalam CanvasWorkspaceProvider",
    );
  }
  return ctx;
}

const ACTIVE_WORKFLOW_KEY = "porto:canvas:active-workspace:v1";
const LEGACY_ACTIVE_WORKFLOW_KEY = "porto:canvas:agent-active-workflow:v1";

export function readStoredWorkspaceId(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      window.localStorage.getItem(ACTIVE_WORKFLOW_KEY) ??
      window.localStorage.getItem(LEGACY_ACTIVE_WORKFLOW_KEY);
    if (!raw) return null;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function persistWorkspaceId(id: number | null) {
  if (typeof window === "undefined") return;
  try {
    if (id === null) window.localStorage.removeItem(ACTIVE_WORKFLOW_KEY);
    else window.localStorage.setItem(ACTIVE_WORKFLOW_KEY, String(id));
    window.localStorage.removeItem(LEGACY_ACTIVE_WORKFLOW_KEY);
  } catch {
    // localStorage bisa gagal di private mode — abaikan.
  }
}
