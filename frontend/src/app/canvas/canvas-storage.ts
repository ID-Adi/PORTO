import type { OrderedExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";

const SCENE_KEY = "porto:canvas:scene:v1";

export type PersistedScene = {
  elements: readonly OrderedExcalidrawElement[];
  appState: Partial<AppState>;
  savedAt: number;
};

export function loadLocalScene(): PersistedScene | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SCENE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedScene;
  } catch {
    return null;
  }
}

export function saveLocalScene(
  elements: readonly OrderedExcalidrawElement[],
  appState: AppState
) {
  if (typeof window === "undefined") return;
  const slim: Partial<AppState> = {
    viewBackgroundColor: appState.viewBackgroundColor,
    currentItemStrokeColor: appState.currentItemStrokeColor,
    currentItemBackgroundColor: appState.currentItemBackgroundColor,
    currentItemFillStyle: appState.currentItemFillStyle,
    currentItemStrokeWidth: appState.currentItemStrokeWidth,
    currentItemRoughness: appState.currentItemRoughness,
    currentItemOpacity: appState.currentItemOpacity,
    currentItemFontFamily: appState.currentItemFontFamily,
    currentItemFontSize: appState.currentItemFontSize,
    currentItemTextAlign: appState.currentItemTextAlign,
    currentItemStartArrowhead: appState.currentItemStartArrowhead,
    currentItemEndArrowhead: appState.currentItemEndArrowhead,
    zoom: appState.zoom,
    scrollX: appState.scrollX,
    scrollY: appState.scrollY,
  };
  try {
    window.localStorage.setItem(
      SCENE_KEY,
      JSON.stringify({ elements, appState: slim, savedAt: Date.now() })
    );
  } catch {
    // Quota exceeded — abaikan; iterasi berikutnya bisa berhasil saat elemen dihapus.
  }
}

export function clearLocalScene() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SCENE_KEY);
}

export type RemoteScene = {
  elements: readonly OrderedExcalidrawElement[];
  appState: Partial<AppState>;
  files?: BinaryFiles;
};

export function isRemoteNewer(
  local: PersistedScene | null,
  remoteUpdatedAt: Date | string | null
): boolean {
  if (!remoteUpdatedAt) return false;
  if (!local) return true;
  const remoteMs =
    remoteUpdatedAt instanceof Date
      ? remoteUpdatedAt.getTime()
      : new Date(remoteUpdatedAt).getTime();
  return remoteMs > local.savedAt;
}
