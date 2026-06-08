"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Download,
  FileImage,
  Loader2,
  RefreshCw,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

type ConvertFormat = "webp" | "jpeg";
type ConverterSession = {
  file: ImageFile | null;
  format: ConvertFormat;
  quality: number;
  status: "idle" | "converting" | "success" | "error";
  resultUrl: string | null;
  resultMimeType: string | null;
  outputBytes: number | null;
  originalBytes: number | null;
  error: string | null;
};

type ImageFile = {
  base64: string;
  dataUrl: string;
  fileName: string;
  mimeType: "image/png" | "image/jpeg" | "image/jpg" | "image/webp";
  size: number;
};

type ConverterHistoryRow = {
  id: number;
  status: string;
  fileUrl: string | null;
  mimeType: string | null;
  fileSize: number | null;
  createdAt: string | Date;
  inputMeta: unknown;
  outputMeta: unknown;
};

type ConverterHistoryEntry = {
  id: number;
  resultUrl: string;
  mimeType: string;
  fileSize: number | null;
  createdAt: number;
  sourceName: string;
  format: string;
  quality: number | null;
  width: number | null;
  height: number | null;
  originalBytes: number | null;
  outputBytes: number | null;
};

const STORAGE_KEY = "porto.tools.session.image-converter";
const SESSION_TTL_MS = 1000 * 60 * 30;
const MAX_FILE_BYTES = 10 * 1024 * 1024;

function defaultSession(): ConverterSession {
  return {
    file: null,
    format: "webp",
    quality: 82,
    status: "idle",
    resultUrl: null,
    resultMimeType: null,
    outputBytes: null,
    originalBytes: null,
    error: null,
  };
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function readSession(): ConverterSession {
  if (typeof window === "undefined") return defaultSession();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSession();
    const parsed = JSON.parse(raw) as Partial<ConverterSession> & {
      savedAt?: number;
    };
    if (Date.now() - (parsed.savedAt ?? 0) > SESSION_TTL_MS) {
      return defaultSession();
    }
    const file = parsed.file;
    const normalizedFile =
      file &&
      typeof file === "object" &&
      typeof (file as ImageFile).base64 === "string" &&
      typeof (file as ImageFile).dataUrl === "string"
        ? (file as ImageFile)
        : null;
    const quality =
      typeof parsed.quality === "number"
        ? Math.min(100, Math.max(1, Math.round(parsed.quality)))
        : 82;
    return {
      file: normalizedFile,
      format: parsed.format === "jpeg" ? "jpeg" : "webp",
      quality,
      status:
        parsed.status === "success" || parsed.status === "error"
          ? parsed.status
          : "idle",
      resultUrl: parsed.resultUrl ?? null,
      resultMimeType: parsed.resultMimeType ?? null,
      outputBytes:
        typeof parsed.outputBytes === "number" ? parsed.outputBytes : null,
      originalBytes:
        typeof parsed.originalBytes === "number" ? parsed.originalBytes : null,
      error: parsed.error ?? null,
    };
  } catch {
    return defaultSession();
  }
}

function writeSession(session: ConverterSession) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...session, savedAt: Date.now() }),
    );
  } catch {
    // ignore quota / private mode
  }
}

function formatBytes(bytes: number | null | undefined) {
  if (!bytes || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  const digits = value >= 100 || index === 0 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[index]}`;
}

function formatDate(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file"));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

function outputLabel(format: ConvertFormat) {
  return format === "jpeg" ? "JPEG" : "WebP";
}

function mapHistory(rows: ConverterHistoryRow[] | undefined): ConverterHistoryEntry[] {
  return (rows ?? [])
    .filter(
      (row): row is ConverterHistoryRow & { fileUrl: string; mimeType: string } =>
        row.status === "success" && typeof row.fileUrl === "string" && typeof row.mimeType === "string",
    )
    .map((row) => {
      const inputMeta = readRecord(row.inputMeta);
      const outputMeta = readRecord(row.outputMeta);
      const createdAt = new Date(row.createdAt).getTime();
      return {
        id: row.id,
        resultUrl: row.fileUrl,
        mimeType: row.mimeType,
        fileSize: typeof row.fileSize === "number" ? row.fileSize : null,
        createdAt: Number.isFinite(createdAt) ? createdAt : 0,
        sourceName:
          typeof inputMeta?.sourceFileName === "string"
            ? inputMeta.sourceFileName
            : `converted-${row.id}`,
        format:
          typeof outputMeta?.format === "string"
            ? outputMeta.format
            : row.mimeType.includes("jpeg")
              ? "jpeg"
              : "webp",
        quality:
          typeof outputMeta?.quality === "number" ? outputMeta.quality : null,
        width: typeof outputMeta?.width === "number" ? outputMeta.width : null,
        height: typeof outputMeta?.height === "number" ? outputMeta.height : null,
        originalBytes:
          typeof outputMeta?.originalBytes === "number"
            ? outputMeta.originalBytes
            : null,
        outputBytes:
          typeof outputMeta?.outputBytes === "number"
            ? outputMeta.outputBytes
            : typeof row.fileSize === "number"
              ? row.fileSize
              : null,
      };
    });
}

export function ImageConverterCard() {
  const utils = trpc.useUtils();
  const convertMutation = trpc.tools.convertImage.useMutation();
  const deleteEntry = trpc.tools.deleteMyEntry.useMutation();
  const historyQuery = trpc.tools.listMyHistory.useQuery({ kind: "image-converter" });

  const history = useMemo(
    () => mapHistory(historyQuery.data as ConverterHistoryRow[] | undefined),
    [historyQuery.data],
  );

  const [session, setSession] = useState<ConverterSession>(() =>
    readSession(),
  );
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    writeSession(session);
  }, [session]);

  async function ingestFile(file: File) {
    if (!["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.type)) {
      toast.error("Format file harus PNG, JPG, JPEG, atau WebP");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error("Ukuran file maksimal 10MB");
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
      setSession((prev) => ({
        ...prev,
        file: {
          base64,
          dataUrl,
          fileName: file.name,
          mimeType: file.type as ImageFile["mimeType"],
          size: file.size,
        },
        status: "idle",
        resultUrl: null,
        resultMimeType: null,
        outputBytes: null,
        originalBytes: file.size,
        error: null,
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memuat file");
    }
  }

  async function onFileInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    await ingestFile(file);
    event.target.value = "";
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session.file) {
      toast.error("Pilih gambar terlebih dulu");
      return;
    }

    setSession((prev) => ({
      ...prev,
      status: "converting",
      resultUrl: null,
      resultMimeType: null,
      outputBytes: null,
      originalBytes: prev.file?.size ?? prev.originalBytes,
      error: null,
    }));

    try {
      const result = await convertMutation.mutateAsync({
        source: {
          base64: session.file.base64,
          mimeType: session.file.mimeType,
          fileName: session.file.fileName,
        },
        format: session.format,
        quality: session.quality,
      });

      setSession((prev) => ({
        ...prev,
        status: "success",
        resultUrl: result.url,
        resultMimeType: result.mimeType,
        outputBytes: result.outputBytes,
        originalBytes: result.originalBytes,
        error: null,
      }));
      await utils.tools.listMyHistory.invalidate({ kind: "image-converter" });
      toast.success("Konversi selesai");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Konversi gambar gagal";
      setSession((prev) => ({
        ...prev,
        status: "error",
        error: message,
      }));
      toast.error(message);
    }
  }

  async function onDeleteHistory(id: number) {
    try {
      await deleteEntry.mutateAsync({ id });
      await utils.tools.listMyHistory.invalidate({ kind: "image-converter" });
      toast.success("History dihapus");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal hapus history");
    }
  }

  function onReset() {
    setSession(defaultSession());
  }

  const latestResultUrl = session.resultUrl ?? history[0]?.resultUrl ?? null;
  const latestResultMime = session.resultMimeType ?? history[0]?.mimeType ?? null;
  const originalBytes = session.originalBytes ?? session.file?.size ?? history[0]?.originalBytes ?? null;
  const outputBytes = session.outputBytes ?? history[0]?.outputBytes ?? history[0]?.fileSize ?? null;
  const reductionPercent =
    originalBytes && outputBytes && originalBytes > 0
      ? Math.max(0, Math.round((1 - outputBytes / originalBytes) * 100))
      : null;

  return (
    <article className="flex h-full min-h-0 flex-col border-(--line) bg-(--background)">
      <header className="screen-line-bottom shrink-0 flex min-h-16 items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-7 shrink-0 place-items-center border border-(--line) text-(--foreground)">
            <FileImage className="size-3.5" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold tracking-tight">
              PNG / JPG to WebP
              <sup className="ml-1 text-[10px] font-medium tracking-normal text-(--muted-foreground)">
                v1
              </sup>
            </h3>
            <p className="line-clamp-1 font-mono text-[10px] tracking-[0.16em] text-(--muted-foreground) uppercase">
              Image convert · local backend
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.18em] text-(--muted-foreground) uppercase">
          <span
            className={cn(
              "size-1.5 rounded-full",
              session.status === "converting"
                ? "bg-amber-500"
                : session.status === "error"
                  ? "bg-rose-500"
                  : "bg-emerald-500",
            )}
          />
          {session.status === "converting"
            ? "running"
            : session.status === "error"
              ? "error"
              : "ready"}
        </div>
      </header>

      <div className="shrink-0 px-4 py-4">
        <p className="font-mono text-xs leading-6 text-(--muted-foreground)">
          Upload satu gambar lalu konversi ke <strong>WebP</strong> atau <strong>JPEG</strong> dengan kualitas terkontrol. Layout dijaga stabil agar perpindahan tab tidak memunculkan lonjakan tinggi panel.
        </p>
      </div>

      <div className="screen-line-top min-h-0 flex-1 overflow-y-auto">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-stretch">
        <section className="min-w-0 border-b border-(--line) p-4 sm:p-5 lg:border-r lg:border-b-0">
          <form className="grid min-w-0 gap-4" onSubmit={onSubmit}>
            <div
              onDragEnter={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setDragActive(false);
              }}
              onDrop={async (event) => {
                event.preventDefault();
                setDragActive(false);
                const file = event.dataTransfer.files?.[0];
                if (file) await ingestFile(file);
              }}
              className={cn(
                "relative grid min-h-[360px] place-items-center border border-dashed border-(--line) bg-(--muted)/20 p-4",
                dragActive && "border-(--foreground) bg-(--muted)/35",
              )}
            >
              {session.file ? (
                <div className="flex h-full min-w-0 w-full flex-col gap-4">
                  <div className="relative flex aspect-square max-h-[420px] min-h-0 w-full min-w-0 items-center justify-center overflow-hidden border border-(--line) bg-(--background)">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={latestResultUrl ?? session.file.dataUrl}
                      alt={session.file.fileName}
                      className="absolute inset-0 h-full w-full object-contain"
                    />
                  </div>
                  <div className="flex min-w-0 flex-col gap-3 text-xs sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[11px] tracking-[0.16em] uppercase">
                        {session.file.fileName}
                      </p>
                      <p className="mt-1 text-(--muted-foreground)">
                        Input {formatBytes(session.file.size)}
                        {latestResultMime ? ` · Output ${outputLabel(latestResultMime.includes("jpeg") ? "jpeg" : "webp")}` : ""}
                      </p>
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-2 border border-(--line) px-3 py-2 font-mono text-[11px] tracking-[0.16em] text-(--muted-foreground) uppercase hover:text-(--foreground)">
                      <Upload className="size-3.5" />
                      Ganti file
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        className="sr-only"
                        onChange={onFileInputChange}
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 text-center">
                  <div className="mx-auto flex size-12 items-center justify-center border border-(--line) bg-(--background)">
                    <Upload className="size-5 text-(--muted-foreground)" />
                  </div>
                  <div>
                    <p className="font-mono text-[11px] tracking-[0.18em] text-(--muted-foreground) uppercase">
                      Drop image here
                    </p>
                    <h2 className="mt-2 text-base font-medium tracking-[-0.03em]">
                      PNG / JPG / WebP Converter
                    </h2>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-(--muted-foreground)">
                      Mendukung <strong>PNG</strong>, <strong>JPG/JPEG</strong>, dan <strong>WebP</strong> hingga <strong>10MB</strong>.
                    </p>
                  </div>
                  <div>
                    <label className="inline-flex cursor-pointer items-center gap-2 border border-(--line) px-4 py-2 font-mono text-[11px] tracking-[0.16em] text-(--muted-foreground) uppercase hover:text-(--foreground)">
                      <Upload className="size-3.5" />
                      Select image
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        className="sr-only"
                        onChange={onFileInputChange}
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {session.status === "error" && session.error ? (
              <div className="border border-rose-500/40 bg-rose-500/5 px-3 py-2 text-sm text-rose-300">
                {session.error}
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-2">
              <div className="font-mono text-[10px] tracking-[0.18em] text-(--muted-foreground) uppercase">
                {session.status === "converting"
                  ? "converting image"
                  : session.file
                    ? "ready to convert"
                    : "awaiting file"}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onReset}
                  disabled={session.status === "converting"}
                  className="h-8 px-2 font-mono text-[11px] tracking-wide"
                >
                  <RefreshCw className="size-3.5" />
                  Reset
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={session.status === "converting" || !session.file}
                  className="h-8 gap-1.5 px-3 font-mono text-[11px] tracking-wide"
                >
                  {session.status === "converting" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <FileImage className="size-3.5" />
                  )}
                  {session.status === "converting" ? "Converting…" : "Convert"}
                </Button>
              </div>
            </div>
          </form>
        </section>

        <aside className="flex min-h-full flex-col p-4 sm:p-5">
          <div className="grid gap-4">
            <div>
              <p className="profile-kicker">Output format</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(["webp", "jpeg"] as const).map((format) => {
                  const active = session.format === format;
                  return (
                    <button
                      key={format}
                      type="button"
                      onClick={() =>
                        setSession((prev) => ({
                          ...prev,
                          format,
                          status: prev.status === "success" ? "idle" : prev.status,
                          resultUrl: prev.status === "success" ? null : prev.resultUrl,
                          resultMimeType:
                            prev.status === "success" ? null : prev.resultMimeType,
                          outputBytes:
                            prev.status === "success" ? null : prev.outputBytes,
                        }))
                      }
                      className={cn(
                        "border px-3 py-2 text-center font-mono text-[11px] tracking-[0.16em] uppercase transition-colors",
                        active
                          ? "border-(--foreground) bg-(--foreground) text-(--background)"
                          : "border-(--line) text-(--muted-foreground) hover:text-(--foreground)",
                      )}
                    >
                      {outputLabel(format)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label
                htmlFor="converter-quality"
                className="flex items-center justify-between font-mono text-[10px] tracking-[0.2em] text-(--muted-foreground) uppercase"
              >
                <span>Quality</span>
                <span>{session.quality}%</span>
              </label>
              <Input
                id="converter-quality"
                type="range"
                min={1}
                max={100}
                step={1}
                value={session.quality}
                onChange={(event) =>
                  setSession((prev) => ({
                    ...prev,
                    quality: Number(event.target.value),
                    status: prev.status === "success" ? "idle" : prev.status,
                    resultUrl: prev.status === "success" ? null : prev.resultUrl,
                    resultMimeType:
                      prev.status === "success" ? null : prev.resultMimeType,
                    outputBytes: prev.status === "success" ? null : prev.outputBytes,
                  }))
                }
                className="mt-2"
              />
            </div>

            <div className="border border-(--line) p-3">
              <p className="profile-kicker">Current stats</p>
              <dl className="mt-3 grid gap-2 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-(--muted-foreground)">Original</dt>
                  <dd className="font-mono">{formatBytes(originalBytes)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-(--muted-foreground)">Output</dt>
                  <dd className="font-mono">{formatBytes(outputBytes)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-(--muted-foreground)">Reduction</dt>
                  <dd className="font-mono">
                    {reductionPercent === null ? "—" : `${reductionPercent}%`}
                  </dd>
                </div>
              </dl>
            </div>

            {latestResultUrl ? (
              <a
                href={latestResultUrl}
                download
                className="inline-flex items-center justify-center gap-2 border border-(--line) px-3 py-2 font-mono text-[11px] tracking-[0.16em] text-(--muted-foreground) uppercase hover:text-(--foreground)"
              >
                <Download className="size-3.5" />
                Download latest
              </a>
            ) : null}

            <div className="border border-(--line)">
              <div className="flex items-center justify-between border-b border-(--line) px-3 py-2.5">
                <span className="font-mono text-[10px] tracking-[0.2em] text-(--muted-foreground) uppercase">
                  History
                </span>
                <span className="font-mono text-[10px] tabular-nums text-(--muted-foreground)">
                  {(history.length).toString().padStart(2, "0")}
                </span>
              </div>
              <div className="max-h-[320px] overflow-y-auto">
                {historyQuery.isLoading ? (
                  <div className="px-3 py-4 text-sm text-(--muted-foreground)">
                    Loading history...
                  </div>
                ) : history.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-(--muted-foreground)">
                    Belum ada hasil konversi.
                  </div>
                ) : (
                  <ul className="divide-y divide-(--line)">
                    {history.map((entry) => (
                      <li key={entry.id} className="px-3 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              setSession((prev) => ({
                                ...prev,
                                status: "success",
                                resultUrl: entry.resultUrl,
                                resultMimeType: entry.mimeType,
                                outputBytes: entry.outputBytes,
                                originalBytes: entry.originalBytes,
                                error: null,
                              }))
                            }
                            className="min-w-0 flex-1 text-left"
                          >
                            <p className="truncate font-mono text-[11px] tracking-[0.14em] uppercase text-(--foreground)">
                              {entry.sourceName}
                            </p>
                            <p className="mt-1 text-xs text-(--muted-foreground)">
                              {outputLabel(entry.format === "jpeg" ? "jpeg" : "webp")} · {formatBytes(entry.outputBytes ?? entry.fileSize)}
                              {entry.width && entry.height ? ` · ${entry.width}×${entry.height}` : ""}
                            </p>
                            <p className="mt-1 text-[11px] text-(--muted-foreground)">
                              {formatDate(new Date(entry.createdAt))}
                            </p>
                          </button>
                          <button
                            type="button"
                            onClick={() => void onDeleteHistory(entry.id)}
                            className="font-mono text-[10px] tracking-[0.16em] text-(--muted-foreground) uppercase hover:text-rose-300"
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </aside>
        </div>
      </div>
    </article>
  );
}
