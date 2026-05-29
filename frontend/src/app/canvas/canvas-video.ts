export type PosterResult = {
  dataURL: string;
  width: number;
  height: number;
};

export async function extractPosterDataURL(videoUrl: string): Promise<PosterResult> {
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = videoUrl;

  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      video.onloadedmetadata = null;
      video.onerror = null;
    };
    video.onloadedmetadata = () => {
      cleanup();
      resolve();
    };
    video.onerror = () => {
      cleanup();
      reject(new Error("Gagal memuat metadata video"));
    };
  });

  const duration = Number.isFinite(video.duration) ? video.duration : 0;
  const seekTo = duration > 0.2 ? 0.1 : 0;

  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      video.onseeked = null;
      video.onerror = null;
    };
    video.onseeked = () => {
      cleanup();
      resolve();
    };
    video.onerror = () => {
      cleanup();
      reject(new Error("Gagal seek video"));
    };
    video.currentTime = seekTo;
  });

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context tidak tersedia");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const dataURL = canvas.toDataURL("image/png");
  return { dataURL, width: video.videoWidth, height: video.videoHeight };
}
