"use client";

import { useState } from "react";
import { ImageIcon, X } from "lucide-react";

import { normalizeImageUrl } from "@/lib/image-url";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import { MediaPicker } from "./media-picker";

export function MediaPickerField({
  label,
  value,
  onChange,
  hint,
  className,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  hint?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const preview = normalizeImageUrl(value);

  return (
    <div className={className}>
      <div className="space-y-1.5">
        <Label>{label}</Label>
        <div className="flex items-start gap-3">
          {preview ? (
            <div className="relative size-20 shrink-0 overflow-hidden border border-(--line) bg-(--muted)">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt=""
                className="size-full object-cover"
              />
              <button
                type="button"
                onClick={() => onChange("")}
                className="absolute top-0.5 right-0.5 inline-flex size-5 items-center justify-center border border-(--line) bg-(--background) text-(--muted-foreground) hover:text-(--destructive)"
                aria-label="Hapus gambar"
              >
                <X className="size-3" />
              </button>
            </div>
          ) : (
            <div className="flex size-20 shrink-0 items-center justify-center border border-dashed border-(--line) bg-(--muted)/40 text-(--muted-foreground)">
              <ImageIcon className="size-6" />
            </div>
          )}

          <div className="flex flex-1 flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(true)}
              className="w-fit"
            >
              {value ? "Ganti gambar" : "Pilih gambar"}
            </Button>
            {value ? (
              <p className="font-mono text-[11px] break-all text-(--muted-foreground)">
                {value}
              </p>
            ) : null}
            {hint ? (
              <p className="text-xs text-(--muted-foreground)">{hint}</p>
            ) : null}
          </div>
        </div>
      </div>

      <MediaPicker open={open} onOpenChange={setOpen} onSelect={onChange} />
    </div>
  );
}
