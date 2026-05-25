"use client";

import Image from "next/image";
import { Download, Maximize2, Plus, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { GenerateKind } from "./generate-card";

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
  isLoading?: boolean;
  className?: string;
};

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
}: {
  entry: HistoryEntry;
  kind: GenerateKind;
  onExpand: (entry: HistoryEntry) => void;
  onAddAsReference?: (entry: HistoryEntry) => void;
}) {
  const aspectStr = entry.aspectRatio.replace(":", " / ");

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
        {kind === "image" && onAddAsReference ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddAsReference(entry);
            }}
            aria-label="Tambahkan sebagai referensi"
            className="pointer-events-auto inline-flex size-5 items-center justify-center border border-(--line) bg-(--background)/85 text-(--muted-foreground) backdrop-blur transition-colors hover:border-(--foreground) hover:text-(--foreground)"
          >
            <Plus className="size-2.5" aria-hidden />
          </button>
        ) : null}
      </div>
    );

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
        </div>
      );
    }

    return (
      <div
        className="relative w-full overflow-hidden border border-(--line) bg-(--muted)/30"
        style={{ aspectRatio: aspectStr }}
      >
        {/* Fragment #t=0.1 memaksa browser men-decode frame pertama agar tampil
            sebagai poster, tanpa harus autoplay. preload=metadata bikin browser
            cukup ambil header video, tidak download full file. */}
        <video
          src={`${entry.resultUrl}#t=0.1`}
          preload="metadata"
          muted
          playsInline
          className="absolute inset-0 size-full object-cover"
        />
        {overlay}
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
  isLoading = false,
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
        <span className="font-mono text-[10px] tabular-nums text-(--muted-foreground)">
          {entries.length.toString().padStart(2, "0")}
        </span>
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
              {entries.map((entry) => (
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
                      className="h-7 flex-1 gap-1 px-2 font-mono text-[10px] tracking-[0.12em] uppercase"
                    >
                      <Download className="size-3" aria-hidden />
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(entry.id)}
                      aria-label="Hapus entri history"
                      className="h-7 gap-1 px-2 font-mono text-[10px] tracking-[0.12em] text-(--muted-foreground) uppercase hover:text-rose-500"
                    >
                      <X className="size-3" aria-hidden />
                      Delete
                    </Button>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </aside>
  );
}
