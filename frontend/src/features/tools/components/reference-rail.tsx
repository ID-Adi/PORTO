"use client";

import { Plus, X } from "lucide-react";
import { useCallback, useId, useRef, useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

import type { ImageFile } from "./image-dropzone";

export const REFERENCE_SLOTS = 6;

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

async function validateAndRead(file: File): Promise<ImageFile | null> {
  if (
    file.type !== "image/jpeg" &&
    file.type !== "image/png" &&
    file.type !== "image/webp"
  ) {
    toast.error("Format harus JPG, PNG, atau WEBP");
    return null;
  }
  if (file.size > MAX_BYTES) {
    toast.error("Ukuran gambar maksimal 10MB");
    return null;
  }
  try {
    return await readFileAsImage(file);
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Gagal memproses gambar");
    return null;
  }
}

type ReferenceSlotProps = {
  index: number;
  value: ImageFile | null;
  disabled: boolean;
  onChange: (file: ImageFile | null) => void;
  onExpand: (file: ImageFile, index: number) => void;
};

function ReferenceSlot({
  index,
  value,
  disabled,
  onChange,
  onExpand,
}: ReferenceSlotProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      const parsed = await validateAndRead(file);
      if (parsed) onChange(parsed);
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
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      const file = event.dataTransfer.files?.[0];
      if (file) void handleFile(file);
    },
    [disabled, handleFile],
  );

  const onDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (!disabled) setIsDragging(true);
    },
    [disabled],
  );

  const onDragLeave = useCallback(() => setIsDragging(false), []);

  const openPicker = useCallback(() => {
    if (disabled) return;
    inputRef.current?.click();
  }, [disabled]);

  const onSlotClick = useCallback(() => {
    if (disabled) return;
    if (value) {
      onExpand(value, index);
    } else {
      openPicker();
    }
  }, [disabled, value, onExpand, index, openPicker]);

  const onClear = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      event.preventDefault();
      onChange(null);
      if (inputRef.current) inputRef.current.value = "";
    },
    [onChange],
  );

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={
        value
          ? `Referensi ${index + 1}: ${value.fileName}. Klik untuk preview.`
          : `Slot referensi ${index + 1}. Klik untuk upload.`
      }
      onClick={onSlotClick}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSlotClick();
        }
      }}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={cn(
        "group relative flex aspect-square w-full cursor-pointer items-center justify-center border bg-(--background) transition-colors outline-none",
        value
          ? "border-(--line) hover:border-(--foreground)/60"
          : "border-dashed border-(--line) hover:border-(--foreground)/40",
        isDragging && "border-(--foreground) bg-(--muted)/40",
        disabled && "pointer-events-none opacity-50",
        "focus-visible:border-(--foreground) focus-visible:ring-1 focus-visible:ring-(--ring)",
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

      <span
        aria-hidden
        className={cn(
          "absolute top-1 left-1 z-10 inline-flex h-4 min-w-4 items-center justify-center border px-1 font-mono text-[9px] leading-none tracking-[0.04em] tabular-nums",
          value
            ? "border-(--foreground) bg-(--foreground) text-(--background)"
            : "border-(--line) bg-(--background) text-(--muted-foreground)",
        )}
      >
        {index + 1}
      </span>

      {value ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value.dataUrl}
            alt={value.fileName}
            className="absolute inset-0 size-full object-cover"
          />
          <button
            type="button"
            onClick={onClear}
            aria-label={`Hapus referensi ${index + 1}`}
            className="absolute top-1 right-1 z-10 inline-flex size-4 items-center justify-center border border-(--line) bg-(--background)/85 text-(--muted-foreground) backdrop-blur transition-colors hover:border-rose-500 hover:text-rose-500"
          >
            <X className="size-2.5" aria-hidden />
          </button>
        </>
      ) : (
        <Plus
          className="size-3 text-(--muted-foreground)"
          aria-hidden
        />
      )}
    </div>
  );
}

type ReferenceRailProps = {
  values: (ImageFile | null)[];
  onChange: (index: number, file: ImageFile | null) => void;
  onExpand: (file: ImageFile, index: number) => void;
  disabled?: boolean;
  className?: string;
};

export function ReferenceRail({
  values,
  onChange,
  onExpand,
  disabled = false,
  className,
}: ReferenceRailProps) {
  const filledCount = values.filter(Boolean).length;
  return (
    <aside
      aria-label="Referensi gambar"
      className={cn(
        "flex w-full flex-col border border-(--line) bg-(--background)",
        "lg:w-20",
        className,
      )}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-(--line) px-2 py-2.5">
        <span className="font-mono text-[10px] tracking-[0.2em] text-(--muted-foreground) uppercase">
          Ref
        </span>
        <span className="font-mono text-[10px] tabular-nums text-(--muted-foreground)">
          {filledCount.toString().padStart(2, "0")}/
          {REFERENCE_SLOTS.toString().padStart(2, "0")}
        </span>
      </header>

      <div className="flex flex-row flex-wrap gap-1.5 p-1.5 lg:flex-col">
        {Array.from({ length: REFERENCE_SLOTS }).map((_, i) => (
          <div
            key={i}
            className="w-14 shrink-0 lg:w-full"
          >
            <ReferenceSlot
              index={i}
              value={values[i] ?? null}
              disabled={disabled}
              onChange={(file) => onChange(i, file)}
              onExpand={onExpand}
            />
          </div>
        ))}
      </div>
    </aside>
  );
}
