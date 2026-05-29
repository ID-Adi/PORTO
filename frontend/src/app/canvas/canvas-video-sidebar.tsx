"use client";

type CanvasVideoSidebarProps = {
  videoUrl: string | null;
};

export function CanvasVideoSidebar({ videoUrl }: CanvasVideoSidebarProps) {
  if (!videoUrl) {
    return (
      <div className="flex h-full items-center justify-center px-4">
        <p className="text-center font-mono text-[11px] tracking-[0.08em] text-muted-foreground">
          Klik poster video di kanvas untuk memutarnya di sini.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-2 p-3">
      <video
        key={videoUrl}
        src={videoUrl}
        controls
        playsInline
        className="w-full border border-line bg-background"
      />
      <p className="truncate font-mono text-[10px] tracking-[0.08em] text-muted-foreground">
        {videoUrl}
      </p>
    </div>
  );
}
