"use client";

import { useState, useRef, useCallback } from "react";
import { Trash2, UploadCloud, Link as LinkIcon, ImageIcon } from "lucide-react";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Tab = "library" | "upload" | "url";

export type MediaPickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string) => void;
};

export function MediaPicker({ open, onOpenChange, onSelect }: MediaPickerProps) {
  const [tab, setTab] = useState<Tab>("library");
  const utils = trpc.useUtils();
  const list = trpc.media.list.useQuery(undefined, { enabled: open });
  const remove = trpc.media.remove.useMutation({
    onSuccess: () => {
      utils.media.list.invalidate();
      toast.success("Media deleted");
    },
    onError: (err) => toast.error(err.message),
  });

  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [externalUrl, setExternalUrl] = useState("");

  const select = useCallback(
    (url: string) => {
      onSelect(url);
      onOpenChange(false);
    },
    [onSelect, onOpenChange],
  );

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Upload failed (${res.status})`);
      }
      const data = (await res.json()) as { url: string };
      await utils.media.list.invalidate();
      toast.success("Uploaded");
      select(data.url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0">
        <DialogHeader>
          <DialogTitle>Media library</DialogTitle>
          <DialogDescription>
            Pilih gambar dari library, upload baru, atau gunakan URL eksternal.
          </DialogDescription>
        </DialogHeader>

        <div className="flex border-b border-(--line) px-4 py-2 font-mono text-[11px] uppercase tracking-[0.12em]">
          <TabButton active={tab === "library"} onClick={() => setTab("library")}>
            <ImageIcon className="size-3.5" /> Library
            {list.data ? (
              <span className="ml-1 text-(--muted-foreground)">({list.data.length})</span>
            ) : null}
          </TabButton>
          <TabButton active={tab === "upload"} onClick={() => setTab("upload")}>
            <UploadCloud className="size-3.5" /> Upload
          </TabButton>
          <TabButton active={tab === "url"} onClick={() => setTab("url")}>
            <LinkIcon className="size-3.5" /> URL
          </TabButton>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4">
          {tab === "library" ? (
            list.isLoading ? (
              <p className="py-12 text-center text-sm text-(--muted-foreground)">
                Memuat…
              </p>
            ) : !list.data?.length ? (
              <p className="py-12 text-center text-sm text-(--muted-foreground)">
                Belum ada media. Buka tab Upload untuk menambah.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                {list.data.map((m) => (
                  <div
                    key={m.id}
                    className="group relative aspect-square overflow-hidden border border-(--line) bg-(--muted)"
                  >
                    <button
                      type="button"
                      onClick={() => select(m.url)}
                      className="absolute inset-0 flex items-center justify-center"
                      aria-label={`Pilih ${m.filename}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={m.url}
                        alt={m.alt ?? m.filename}
                        className="size-full object-cover transition-transform group-hover:scale-105"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Hapus ${m.filename}?`)) {
                          remove.mutate({ id: m.id });
                        }
                      }}
                      className="absolute top-1 right-1 inline-flex size-6 items-center justify-center border border-(--line) bg-(--background) text-(--muted-foreground) opacity-0 transition-opacity group-hover:opacity-100 hover:text-(--destructive)"
                      aria-label="Hapus"
                    >
                      <Trash2 className="size-3" />
                    </button>
                    <div className="absolute right-0 bottom-0 left-0 truncate bg-(--background)/80 px-1.5 py-1 font-mono text-[10px] text-(--muted-foreground) backdrop-blur-sm">
                      {m.filename}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : null}

          {tab === "upload" ? (
            <div className="space-y-3">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "copy";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) uploadFile(file);
                }}
                className={cn(
                  "flex h-48 flex-col items-center justify-center gap-2 border-2 border-dashed border-(--line) bg-(--muted)/40 text-center transition-colors hover:bg-(--muted)",
                  uploading && "opacity-50",
                )}
              >
                <UploadCloud className="size-8 text-(--muted-foreground)" />
                <p className="text-sm">Drop file di sini atau</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? "Mengupload…" : "Pilih file"}
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadFile(file);
                    e.target.value = "";
                  }}
                />
                <p className="text-xs text-(--muted-foreground)">
                  PNG/JPG/WebP/SVG/GIF · maks 2MB
                </p>
              </div>
            </div>
          ) : null}

          {tab === "url" ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="external-url">URL gambar</Label>
                <Input
                  id="external-url"
                  type="url"
                  placeholder="https://…"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                />
                <p className="text-xs text-(--muted-foreground)">
                  Gambar eksternal tidak masuk ke library, hanya disimpan sebagai URL.
                </p>
              </div>
              <Button
                type="button"
                disabled={!externalUrl}
                onClick={() => {
                  select(externalUrl.trim());
                  setExternalUrl("");
                }}
              >
                Gunakan URL ini
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 border-b-2 px-3 py-2 transition-colors",
        active
          ? "border-(--foreground) text-(--foreground)"
          : "border-transparent text-(--muted-foreground) hover:text-(--foreground)",
      )}
    >
      {children}
    </button>
  );
}
