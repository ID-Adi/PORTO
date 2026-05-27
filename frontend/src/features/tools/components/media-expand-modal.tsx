"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type MediaExpandTarget = {
  kind: "image" | "video";
  url: string;
  prompt?: string;
  aspectRatio?: string;
  fileName?: string;
};

type MediaExpandModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: MediaExpandTarget | null;
};

export function MediaExpandModal({
  open,
  onOpenChange,
  target,
}: MediaExpandModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-[min(92vw,1100px)] w-full p-0 gap-0 border border-(--line) bg-(--background)",
        )}
      >
        <DialogTitle className="sr-only">
          {target?.kind === "video" ? "Preview video" : "Preview gambar"}
        </DialogTitle>

        <div className="flex items-center justify-between gap-3 border-b border-(--line) px-4 py-2.5 font-mono text-[10px] tracking-[0.2em] text-(--muted-foreground) uppercase">
          <span>{target?.kind === "video" ? "Video Preview" : "Image Preview"}</span>
          {target?.aspectRatio ? (
            <span className="tabular-nums">{target.aspectRatio}</span>
          ) : null}
        </div>

        <div className="relative grid place-items-center bg-(--muted)/20 p-2 sm:p-4">
          {target?.kind === "image" && target.url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={target.url}
              src={target.url}
              alt={target.prompt ?? "Preview"}
              className="block max-h-[78vh] w-auto max-w-full object-contain"
            />
          ) : target?.kind === "video" && target.url ? (
            <video
              key={target.url}
              src={target.url}
              controls
              playsInline
              className="block max-h-[78vh] w-auto max-w-full object-contain"
            />
          ) : null}
        </div>

        {target?.prompt ? (
          <div className="border-t border-(--line) px-4 py-2.5">
            <p
              title={target.prompt}
              className="line-clamp-2 font-mono text-[10px] leading-4 text-(--muted-foreground)"
            >
              {target.prompt}
            </p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
