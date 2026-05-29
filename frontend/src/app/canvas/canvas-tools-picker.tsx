"use client";

import { ImagePlus, Loader2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

import { insertImageFromUrl, insertVideoFromUrl } from "./canvas-insert";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { RefObject } from "react";

type Kind = "image" | "video";

type CanvasToolsPickerProps = {
  apiRef: RefObject<ExcalidrawImperativeAPI | null>;
};

export function CanvasToolsPicker({ apiRef }: CanvasToolsPickerProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Kind>("image");
  const [pendingId, setPendingId] = useState<number | null>(null);
  const { data: session } = authClient.useSession();
  const isAuthed = Boolean(session?.user);

  const historyQuery = trpc.tools.listMyHistory.useQuery(
    { kind: tab },
    { enabled: open && isAuthed, staleTime: 30_000 }
  );

  async function handlePick(
    id: number,
    fileUrl: string,
    prompt: string,
    mimeType: string | null
  ) {
    if (!apiRef.current || pendingId !== null) return;
    setPendingId(id);
    try {
      if (tab === "image") {
        await insertImageFromUrl(apiRef.current, fileUrl);
      } else {
        await insertVideoFromUrl(apiRef.current, fileUrl, mimeType ?? "video/mp4");
      }
      toast.success(
        tab === "image" ? "Image disisipkan" : "Video disisipkan",
        { description: prompt }
      );
      setPendingId(null);
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal menyisipkan"
      );
      setPendingId(null);
    }
  }

  const rows = (historyQuery.data ?? []).filter(
    (row) => row.status === "success" && row.fileUrl
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Cegah modal menutup saat sisipan masih berjalan.
        if (!next && pendingId !== null) return;
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Sisipkan dari /tools"
          title="Sisipkan dari /tools"
          className="canvas-header-toggle"
          disabled={!isAuthed}
        >
          <ImagePlus aria-hidden className="size-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl rounded-none border border-line bg-background">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm tracking-[0.12em] uppercase">
            Sisipkan dari /tools
          </DialogTitle>
        </DialogHeader>

        <div className="flex border-b border-line">
          {(["image", "video"] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => setTab(kind)}
              className={cn(
                "flex-1 border-r border-line py-2 font-mono text-[11px] tracking-[0.12em] uppercase transition-colors last:border-r-0",
                tab === kind
                  ? "bg-muted/60 text-foreground"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              )}
            >
              {kind}
            </button>
          ))}
        </div>

        <div className="flex max-h-[70vh] min-h-[40vh] flex-col overflow-y-auto">
        {!isAuthed ? (
          <p className="flex flex-1 items-center justify-center px-4 text-center font-mono text-xs text-muted-foreground">
            Login dulu untuk melihat history /tools.
          </p>
        ) : historyQuery.isLoading ? (
          <div className="flex flex-1 items-center justify-center gap-2 font-mono text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            Memuat history…
          </div>
        ) : rows.length === 0 ? (
          <p className="flex flex-1 items-center justify-center px-4 text-center font-mono text-xs text-muted-foreground">
            Belum ada hasil {tab} di /tools. Generate dulu di halaman /tools.
          </p>
        ) : (
          <div className="columns-3 gap-2 p-1">
            {rows.map((row) => {
              const aspect = row.aspectRatio
                ? row.aspectRatio.replace(":", " / ")
                : "1 / 1";
              const isPending = pendingId === row.id;
              return (
                <button
                  key={row.id}
                  type="button"
                  disabled={pendingId !== null}
                  onClick={() =>
                    row.fileUrl &&
                    handlePick(row.id, row.fileUrl, row.prompt, row.mimeType)
                  }
                  title={row.prompt}
                  className="relative mb-2 block w-full cursor-pointer overflow-hidden border border-line bg-background transition-colors hover:border-foreground disabled:cursor-not-allowed disabled:opacity-60 break-inside-avoid"
                  style={{ aspectRatio: aspect }}
                >
                  {tab === "image" ? (
                    <Image
                      src={row.fileUrl!}
                      alt={row.prompt}
                      fill
                      sizes="200px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <video
                      src={row.fileUrl!}
                      muted
                      playsInline
                      preload="metadata"
                      className="size-full object-cover"
                    />
                  )}
                  {isPending && (
                    <span className="absolute inset-0 flex items-center justify-center bg-background/70">
                      <Loader2
                        className="size-5 animate-spin text-foreground"
                        aria-hidden
                      />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
