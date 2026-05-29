import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import { extractPosterDataURL } from "./canvas-video";

async function urlToDataURL(
  url: string
): Promise<{ dataURL: string; mimeType: string }> {
  const resp = await fetch(url, { credentials: "include" });
  if (!resp.ok) throw new Error(`Gagal fetch image: ${resp.status}`);
  const blob = await resp.blob();
  const dataURL = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  return { dataURL, mimeType: blob.type || "image/png" };
}

async function getImageNaturalSize(
  dataURL: string
): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => reject(new Error("Gagal memuat image"));
    img.src = dataURL;
  });
}

export async function insertImageFromUrl(
  api: ExcalidrawImperativeAPI,
  url: string
) {
  const { convertToExcalidrawElements } = await import("@excalidraw/excalidraw");
  const { dataURL, mimeType } = await urlToDataURL(url);
  const { w: natW, h: natH } = await getImageNaturalSize(dataURL);

  const fileId = crypto.randomUUID();
  api.addFiles([
    {
      id: fileId as never,
      mimeType: mimeType as never,
      dataURL: dataURL as never,
      created: Date.now(),
    },
  ]);

  const maxW = 400;
  const width = natW > maxW ? maxW : natW;
  const height = (natH / natW) * width;

  const appState = api.getAppState();
  const cx = -appState.scrollX + appState.width / (2 * appState.zoom.value);
  const cy = -appState.scrollY + appState.height / (2 * appState.zoom.value);
  const x = cx - width / 2;
  const y = cy - height / 2;

  const elements = convertToExcalidrawElements([
    {
      type: "image",
      x,
      y,
      width,
      height,
      fileId: fileId as never,
    },
  ]);

  api.updateScene({
    elements: [...api.getSceneElements(), ...elements],
  });
}

export async function insertVideoFromUrl(
  api: ExcalidrawImperativeAPI,
  videoUrl: string,
  mimeType: string = "video/mp4"
) {
  const { convertToExcalidrawElements } = await import("@excalidraw/excalidraw");
  const { dataURL, width: natW, height: natH } = await extractPosterDataURL(
    videoUrl
  );

  const fileId = crypto.randomUUID();
  api.addFiles([
    {
      id: fileId as never,
      mimeType: "image/png" as never,
      dataURL: dataURL as never,
      created: Date.now(),
    },
  ]);

  const maxW = 400;
  const width = natW > maxW ? maxW : natW;
  const height = (natH / natW) * width;

  const appState = api.getAppState();
  const cx = -appState.scrollX + appState.width / (2 * appState.zoom.value);
  const cy = -appState.scrollY + appState.height / (2 * appState.zoom.value);

  const elements = convertToExcalidrawElements([
    {
      type: "image",
      x: cx - width / 2,
      y: cy - height / 2,
      width,
      height,
      fileId: fileId as never,
      link: videoUrl,
      customData: { kind: "video", videoUrl, mimeType },
    },
  ]);

  api.updateScene({
    elements: [...api.getSceneElements(), ...elements],
  });
}
