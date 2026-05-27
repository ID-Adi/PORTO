"use client";

import Image from "next/image";
import { Download, Maximize2, Plus, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import type { GenerateKind } from "./generate-card";

function videoProxySrc(url: string): string {
  return `/api/video?url=${encodeURIComponent(url)}`;
}

export type HistoryEntry = {
  id: number;
  createdAt: number;
  prompt: string;
  aspectRatio: string;
  resultUrl: string | null;
};

type HistoryPanelProps = {
  kind: GenerateKind;
  entries: HistoryEntry[];
  onDelete: (id: number) => void;
  onSave: (entry: HistoryEntry) => void;
  onExpand: (entry: HistoryEntry) => void;
  onAddAsReference?: (entry: HistoryEntry) => void;
  onAddToVideoFrame?: (entry: HistoryEntry, target: VideoFrameTarget) => void;
  addingReferenceId?: number | null;
  downloadProgress?: Record<number, number>;
  isLoading?: boolean;
  modeToggle?: ReactNode;
  className?: string;
};

export type VideoFrameTarget = "first" | "last";

const MONTH_ID_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

function formatTimestamp(ts: number) {
  const d = new Date(ts);
  const day = d.getDate().toString().padStart(2, "0");
  const month = MONTH_ID_SHORT[d.getMonth()];
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${day} ${month} · ${hh}:${mm}`;
}

function HistoryThumbnail({
  entry,
  kind,
  onExpand,
  onAddAsReference,
  onAddToVideoFrame,
  isAddingReference = false,
  downloadPct,
}: {
  entry: HistoryEntry;
  kind: GenerateKind;
  onExpand: (entry: HistoryEntry) => void;
  onAddAsReference?: (entry: HistoryEntry) => void;
  onAddToVideoFrame?: (entry: HistoryEntry, target: VideoFrameTarget) => void;
  isAddingReference?: boolean;
  downloadPct?: number;
}) {
  const aspectStr = entry.aspectRatio.replace(":", " / ");
  const isDownloading = downloadPct !== undefined;

  if (entry.resultUrl) {
    const overlay = (
      <div className="pointer-events-none absolute top-1 left-1 z-10 flex gap-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onExpand(entry);
          }}
          aria-label="Perbesar preview"
          className="pointer-events-auto inline-flex size-5 items-center justify-center border border-(--line) bg-(--background)/85 text-(--muted-foreground) backdrop-blur transition-colors hover:border-(--foreground) hover:text-(--foreground)"
        >
          <Maximize2 className="size-2.5" aria-hidden />
        </button>
        {kind === "image" && onAddToVideoFrame ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                }}
                aria-label="Tambahkan ke frame video"
                aria-busy={isAddingReference}
                disabled={isAddingReference}
                className="pointer-events-auto inline-flex size-5 items-center justify-center border border-(--line) bg-(--background)/85 text-(--muted-foreground) backdrop-blur transition-colors hover:border-(--foreground) hover:text-(--foreground) disabled:pointer-events-none disabled:opacity-70"
              >
                <Plus
                  className={cn("size-2.5", isAddingReference && "opacity-0")}
                  aria-hidden
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-36 rounded-none border border-(--line) bg-(--background) p-1"
            >
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToVideoFrame(entry, "first");
                  }}
                  className="rounded-none font-mono text-[10px] tracking-[0.12em] text-(--foreground) uppercase"
                >
                  First Frame
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToVideoFrame(entry, "last");
                  }}
                  className="rounded-none font-mono text-[10px] tracking-[0.12em] text-(--foreground) uppercase"
                >
                  End Frame
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : kind === "image" && onAddAsReference ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddAsReference(entry);
            }}
            aria-label="Tambahkan sebagai referensi"
            aria-busy={isAddingReference}
            disabled={isAddingReference}
            className="pointer-events-auto inline-flex size-5 items-center justify-center border border-(--line) bg-(--background)/85 text-(--muted-foreground) backdrop-blur transition-colors hover:border-(--foreground) hover:text-(--foreground) disabled:pointer-events-none disabled:opacity-70"
          >
            <Plus className={cn("size-2.5", isAddingReference && "opacity-0")} aria-hidden />
          </button>
        ) : null}
      </div>
    );

    // Overlay progress download — tampil di atas thumbnail saat sedang mengunduh.
    const downloadOverlay = isDownloading ? (
      <div
        role="progressbar"
        aria-valuenow={downloadPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Mengunduh"
        className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-(--background)/75 backdrop-blur-[2px]"
      >
        <span className="font-mono text-[13px] font-semibold tabular-nums text-(--foreground)">
          {downloadPct}%
        </span>
        <div className="absolute inset-x-0 bottom-0 h-[3px] bg-(--muted)">
          <div
            className="h-full bg-(--foreground) transition-[width] duration-150"
            style={{ width: `${downloadPct}%` }}
          />
        </div>
      </div>
    ) : null;

    if (kind === "image") {
      return (
        <div
          className="relative w-full overflow-hidden border border-(--line) bg-(--muted)/30"
          style={{ aspectRatio: aspectStr }}
        >
          <Image
            src={entry.resultUrl}
            alt={entry.prompt}
            fill
            sizes="(max-width: 1024px) 100vw, 14rem"
            className="object-cover"
            unoptimized
          />
          {overlay}
          {downloadOverlay}
          {isAddingReference ? (
            <div
              role="progressbar"
              aria-label="Menambahkan referensi"
              className="absolute inset-x-0 bottom-0 z-20 h-1 overflow-hidden bg-(--muted)"
            >
              <div className="h-full w-1/2 animate-pulse bg-(--foreground)" />
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <div
        className="relative w-full overflow-hidden border border-(--line) bg-(--muted)/30"
        style={{ aspectRatio: aspectStr }}
      >
        {/* Proxy ke /api/video agar browser bisa range-request:
            preload=metadata ambil header, lalu seek 0.1s untuk poster frame. */}
        <video
          src={videoProxySrc(entry.resultUrl)}
          preload="metadata"
          muted
          playsInline
          onLoadedMetadata={(e) => {
            e.currentTarget.currentTime = 0.1;
          }}
          className="absolute inset-0 size-full object-cover"
        />
        {overlay}
        {downloadOverlay}
      </div>
    );
  }

  return (
    <div
      className="relative w-full overflow-hidden border border-(--line) bg-(--muted)/30"
      style={{ aspectRatio: aspectStr }}
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-[repeating-linear-gradient(45deg,var(--color-line)_0,var(--color-line)_1px,transparent_1px,transparent_6px)] opacity-40"
      />
      <div className="absolute inset-0 grid place-items-center font-mono text-[9px] tracking-[0.2em] text-(--muted-foreground) uppercase">
        preview
      </div>
    </div>
  );
}

export function HistoryPanel({
  kind,
  entries,
  onDelete,
  onSave,
  onExpand,
  onAddAsReference,
  onAddToVideoFrame,
  addingReferenceId = null,
  downloadProgress = {},
  isLoading = false,
  modeToggle,
  className,
}: HistoryPanelProps) {
  return (
    <aside
      aria-label={`Riwayat ${kind === "image" ? "gambar" : "video"}`}
      className={cn(
        "flex w-full flex-col border border-(--line) bg-(--background)",
        "max-h-[40vh] lg:max-h-[60vh] lg:w-56",
        className,
      )}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-(--line) px-3 py-2.5">
        <span className="font-mono text-[10px] tracking-[0.2em] text-(--muted-foreground) uppercase">
          History
        </span>
        <div className="flex items-center gap-2">
          {modeToggle}
          <span className="font-mono text-[10px] tabular-nums text-(--muted-foreground)">
            {entries.length.toString().padStart(2, "0")}
          </span>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading && entries.length === 0 ? (
          <ul className="divide-y divide-(--line)">
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex flex-col gap-2 p-3">
                <div className="h-2.5 w-1/2 animate-pulse bg-(--muted)" />
                <div
                  className="w-full animate-pulse bg-(--muted)"
                  style={{ aspectRatio: "1 / 1" }}
                />
                <div className="h-2 w-3/4 animate-pulse bg-(--muted)" />
              </li>
            ))}
          </ul>
        ) : entries.length === 0 ? (
          <div className="grid h-full place-items-center p-6 text-center font-mono text-[10px] tracking-[0.18em] text-(--muted-foreground) uppercase">
            Belum ada riwayat
          </div>
        ) : (
          <ul className="divide-y divide-(--line)">
            <AnimatePresence initial={false}>
              {entries.map((entry) => {
                const dlPct = downloadProgress[entry.id];
                const isDownloading = dlPct !== undefined;
                return (
                  <motion.li
                    key={entry.id}
                    layout
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -16, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="flex flex-col gap-2 p-3"
                  >
                    <div className="flex items-center justify-between gap-2 font-mono text-[10px] tracking-[0.14em] uppercase">
                      <time
                        dateTime={new Date(entry.createdAt).toISOString()}
                        className="text-(--muted-foreground)"
                      >
                        {formatTimestamp(entry.createdAt)}
                      </time>
                      <span className="text-(--muted-foreground)">
                        {entry.aspectRatio}
                      </span>
                    </div>

                    <HistoryThumbnail
                      entry={entry}
                      kind={kind}
                      onExpand={onExpand}
                      onAddAsReference={onAddAsReference}
                      onAddToVideoFrame={onAddToVideoFrame}
                      isAddingReference={addingReferenceId === entry.id}
                      downloadPct={dlPct}
                    />

                    {entry.prompt ? (
                      <p
                        title={entry.prompt}
                        className="line-clamp-2 font-mono text-[10px] leading-4 text-(--muted-foreground)"
                      >
                        {entry.prompt}
                      </p>
                    ) : null}

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onSave(entry)}
                        disabled={isDownloading}
                        className="h-7 flex-1 gap-1 px-2 font-mono text-[10px] tracking-[0.12em] uppercase disabled:opacity-60"
                      >
                        <Download className="size-3" aria-hidden />
                        {isDownloading ? `${dlPct}%` : "Save"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(entry.id)}
                        disabled={isDownloading}
                        aria-label="Hapus entri history"
                        className="h-7 gap-1 px-2 font-mono text-[10px] tracking-[0.12em] text-(--muted-foreground) uppercase hover:text-rose-500 disabled:opacity-50"
                      >
                        <X className="size-3" aria-hidden />
                        Delete
                      </Button>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </aside>
  );
}
