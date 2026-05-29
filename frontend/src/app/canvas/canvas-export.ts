import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export async function exportScenePNG(api: ExcalidrawImperativeAPI) {
  const elements = api.getSceneElements();
  if (elements.length === 0) return false;
  const { exportToBlob } = await import("@excalidraw/excalidraw");
  const blob = await exportToBlob({
    elements,
    appState: {
      ...api.getAppState(),
      exportBackground: false,
      exportWithDarkMode: false,
    },
    files: api.getFiles(),
    mimeType: "image/png",
    quality: 1,
  });
  downloadFile(blob, `porto-canvas-${timestamp()}.png`);
  return true;
}

export async function exportSceneSVG(api: ExcalidrawImperativeAPI) {
  const elements = api.getSceneElements();
  if (elements.length === 0) return false;
  const { exportToSvg } = await import("@excalidraw/excalidraw");
  const svg = await exportToSvg({
    elements,
    appState: { ...api.getAppState(), exportBackground: false },
    files: api.getFiles(),
  });
  const blob = new Blob([new XMLSerializer().serializeToString(svg)], {
    type: "image/svg+xml",
  });
  downloadFile(blob, `porto-canvas-${timestamp()}.svg`);
  return true;
}
