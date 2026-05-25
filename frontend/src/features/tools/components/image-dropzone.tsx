"use client";

import { ImagePlus, X } from "lucide-react";
import { useCallback, useId, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ImageFile = {
  base64: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  dataUrl: string;
  fileName: string;
};

type ImageDropzoneProps = {
  label: string;
  value: ImageFile | null;
  onChange: (file: ImageFile | null) => void;
  disabled?: boolean;
  optional?: boolean;
  className?: string;
};

const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_BYTES = 10 * 1024 * 1024;

function readFileAsImage(file: File): Promise<ImageFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file"));
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== "string") {
        reject(new Error("Format dataURL tidak valid"));
        return;
      }
      const commaIdx = dataUrl.indexOf(",");
      if (commaIdx < 0) {
        reject(new Error("Format dataURL tidak valid"));
        return;
      }
      const base64 = dataUrl.slice(commaIdx + 1);
      const mimeType = file.type as ImageFile["mimeType"];
      resolve({
        base64,
        mimeType,
        dataUrl,
        fileName: file.name,
      });
    };
    reader.readAsDataURL(file);
  });
}

export function ImageDropzone({
  label,
  value,
  onChange,
  disabled = false,
  optional = false,
  className,
}: ImageDropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("File harus berupa gambar");
        return;
      }
      if (
        file.type !== "image/jpeg" &&
        file.type !== "image/png" &&
        file.type !== "image/webp"
      ) {
        toast.error("Format harus JPG, PNG, atau WEBP");
        return;
      }
      if (file.size > MAX_BYTES) {
        toast.error("Ukuran gambar maksimal 10MB");
        return;
      }
      try {
        const parsed = await readFileAsImage(file);
        onChange(parsed);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal memproses gambar");
      }
    },
    [onChange],
  );

  const onInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) void handleFile(file);
      event.target.value = "";
    },
    [handleFile],
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLLabelElement>) => {
      event.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      const file = event.dataTransfer.files?.[0];
      if (file) void handleFile(file);
    },
    [disabled, handleFile],
  );

  const onDragOver = useCallback(
    (event: React.DragEvent<HTMLLabelElement>) => {
      event.preventDefault();
      if (!disabled) setIsDragging(true);
    },
    [disabled],
  );

  const onDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const onClear = useCallback(() => {
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }, [onChange]);

  return (
    <div className={cn("flex w-full flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.2em] text-(--muted-foreground) uppercase">
        <span>{label}</span>
        <span className="tabular-nums">
          {optional ? "optional" : "required"}
        </span>
      </div>

      <label
        htmlFor={inputId}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={cn(
          "relative flex aspect-square w-full cursor-pointer items-center justify-center border bg-(--background) transition-colors",
          value
            ? "border-(--line)"
            : "border-dashed border-(--line) hover:border-(--foreground)/40",
          isDragging && "border-(--foreground) bg-(--muted)/40",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPT}
          disabled={disabled}
          onChange={onInputChange}
          className="sr-only"
        />

        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value.dataUrl}
              alt={value.fileName}
              className="absolute inset-0 size-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-(--background)/85 px-2 py-1 backdrop-blur">
              <span className="line-clamp-1 font-mono text-[9px] tracking-[0.12em] text-(--muted-foreground) uppercase">
                {value.fileName}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClear();
                }}
                aria-label="Hapus gambar"
                disabled={disabled}
                className="h-6 gap-1 px-1.5 font-mono text-[9px] tracking-[0.12em] uppercase"
              >
                <X className="size-3" aria-hidden />
                Hapus
              </Button>
            </div>
          </>
        ) : (
          <div className="pointer-events-none flex flex-col items-center gap-1.5 text-center font-mono text-[10px] tracking-[0.18em] text-(--muted-foreground) uppercase">
            <ImagePlus className="size-5" aria-hidden />
            <span>Klik / drop gambar</span>
            <span className="text-[9px] tracking-[0.14em]">JPG · PNG · WEBP · ≤10MB</span>
          </div>
        )}
      </label>
    </div>
  );
}
