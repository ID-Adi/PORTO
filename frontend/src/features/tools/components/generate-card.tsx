"use client";

import { Image as ImageIcon, RotateCcw, Send, Video } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

import { GeneratingAnimation } from "./generating-animation";
import { HistoryPanel, type HistoryEntry } from "./history-panel";

export type GenerateKind = "image" | "video";

type Status = "idle" | "generating" | "success" | "error";

type AspectOption = {
  label: string;
  value: string;
  ratio: number;
};

type PersistedSession = {
  prompt: string;
  status: Status;
  startedAt: number | null;
  resultUrl: string | null;
  error: string | null;
  aspectRatio: string;
  // Optional jobId yang akan diisi backend/N8N saat integrasi.
  jobId: string | null;
};

const STORAGE_PREFIX = "porto.tools.session";
const SESSION_TTL_MS = 1000 * 60 * 30; // 30 menit

const ASPECT_OPTIONS: Record<GenerateKind, ReadonlyArray<AspectOption>> = {
  image: [
    { label: "1:1", value: "1:1", ratio: 1 },
    { label: "4:5", value: "4:5", ratio: 4 / 5 },
    { label: "3:4", value: "3:4", ratio: 3 / 4 },
    { label: "16:9", value: "16:9", ratio: 16 / 9 },
    { label: "9:16", value: "9:16", ratio: 9 / 16 },
  ],
  video: [
    { label: "16:9", value: "16:9", ratio: 16 / 9 },
    { label: "9:16", value: "9:16", ratio: 9 / 16 },
    { label: "1:1", value: "1:1", ratio: 1 },
    { label: "4:3", value: "4:3", ratio: 4 / 3 },
    { label: "21:9", value: "21:9", ratio: 21 / 9 },
  ],
};

function findAspect(kind: GenerateKind, value: string): AspectOption {
  return (
    ASPECT_OPTIONS[kind].find((option) => option.value === value) ??
    ASPECT_OPTIONS[kind][0]
  );
}

function defaultSession(kind: GenerateKind): PersistedSession {
  return {
    prompt: "",
    status: "idle",
    startedAt: null,
    resultUrl: null,
    error: null,
    aspectRatio: ASPECT_OPTIONS[kind][0].value,
    jobId: null,
  };
}

function readSession(kind: GenerateKind): PersistedSession {
  const fallback = defaultSession(kind);
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}.${kind}`);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as PersistedSession & { savedAt?: number };
    const savedAt = parsed.savedAt ?? 0;
    if (Date.now() - savedAt > SESSION_TTL_MS) return fallback;
    const aspectRatio =
      parsed.aspectRatio &&
      ASPECT_OPTIONS[kind].some((opt) => opt.value === parsed.aspectRatio)
        ? parsed.aspectRatio
        : fallback.aspectRatio;
    return {
      prompt: parsed.prompt ?? "",
      status: parsed.status ?? "idle",
      startedAt: parsed.startedAt ?? null,
      resultUrl: parsed.resultUrl ?? null,
      error: parsed.error ?? null,
      aspectRatio,
      jobId: parsed.jobId ?? null,
    };
  } catch {
    return fallback;
  }
}

function writeSession(kind: GenerateKind, session: PersistedSession) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      `${STORAGE_PREFIX}.${kind}`,
      JSON.stringify({ ...session, savedAt: Date.now() }),
    );
  } catch {
    // quota exceeded / private mode — silently ignore
  }
}

const COPY: Record<
  GenerateKind,
  {
    title: string;
    sup: string;
    description: string;
    placeholder: string;
    icon: typeof ImageIcon;
    submitLabel: string;
    workingLabel: string;
  }
> = {
  image: {
    title: "Generate Image",
    sup: "v1",
    description:
      "Tulis prompt deskriptif. Pipeline N8N akan memproses dan mengembalikan satu gambar.",
    placeholder:
      "Contoh: ilustrasi editorial monokrom, garis tipis, komposisi rule-of-thirds, atmosphere senja...",
    icon: ImageIcon,
    submitLabel: "Generate",
    workingLabel: "AI Generating",
  },
  video: {
    title: "Generate Video",
    sup: "v1",
    description:
      "Tulis prompt naratif singkat. Pipeline N8N akan render klip pendek (≤ 5 detik).",
    placeholder:
      "Contoh: kamera dolly-in perlahan di lorong studio, lighting kontras tinggi, gerakan halus...",
    icon: Video,
    submitLabel: "Generate",
    workingLabel: "Rendering",
  },
};

function buildPreviewStyle(value: string, kind: GenerateKind): React.CSSProperties {
  const aspect = findAspect(kind, value);
  // width = min(100%, 28rem, calc(60vh * ratio)) menjaga agar height tidak
  // pernah melebihi ~60vh sekaligus tetap menghormati aspect-ratio asli.
  return {
    aspectRatio: aspect.value.replace(":", " / "),
    width: `min(100%, 28rem, calc(60vh * ${aspect.ratio}))`,
  };
}

type GenerateCardProps = {
  kind: GenerateKind;
};

export function GenerateCard({ kind }: GenerateCardProps) {
  const copy = COPY[kind];
  const Icon = copy.icon;
  const aspectOptions = ASPECT_OPTIONS[kind];

  const utils = trpc.useUtils();
  const historyQuery = trpc.tools.listMyHistory.useQuery({ kind });
  const generateImage = trpc.tools.generateImage.useMutation();
  const deleteEntry = trpc.tools.deleteMyEntry.useMutation();

  const history = useMemo<HistoryEntry[]>(() => {
    return (historyQuery.data ?? [])
      .filter((row) => row.status === "success" && row.fileUrl)
      .map((row) => {
        const ts = new Date(row.createdAt as unknown as string).getTime();
        return {
          id: row.id,
          createdAt: Number.isFinite(ts) ? ts : 0,
          prompt: row.prompt,
          aspectRatio: row.aspectRatio,
          resultUrl: row.fileUrl,
        };
      });
  }, [historyQuery.data]);

  const [session, setSession] = useState<PersistedSession>(() =>
    defaultSession(kind),
  );
  const [hasMounted, setHasMounted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number | null>(null);

  useEffect(() => {
    // Hidrasi state dari localStorage pasca-mount; tidak bisa di-init di
    // useState karena localStorage tidak tersedia saat SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession(readSession(kind));
    setHasMounted(true);
  }, [kind]);

  useEffect(() => {
    if (!hasMounted) return;
    writeSession(kind, session);
  }, [kind, session, hasMounted]);

  useEffect(() => {
    if (session.status !== "generating" || !session.startedAt) {
      return;
    }
    const startedAt = session.startedAt;
    const id = setInterval(
      () =>
        setElapsedSeconds(
          Math.max(1, Math.floor((Date.now() - startedAt) / 1000)),
        ),
      500,
    );
    return () => clearInterval(id);
  }, [session.status, session.startedAt]);

  const setPrompt = useCallback((prompt: string) => {
    setSession((prev) => ({ ...prev, prompt }));
  }, []);

  const setAspectRatio = useCallback((value: string) => {
    setSession((prev) =>
      prev.status === "generating" || prev.aspectRatio === value
        ? prev
        : { ...prev, aspectRatio: value },
    );
  }, []);

  const onSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const prompt = session.prompt.trim();
      if (!prompt) {
        toast.error("Prompt tidak boleh kosong");
        return;
      }
      if (session.status === "generating") return;

      if (kind === "video") {
        toast.info("Pipeline video belum tersedia di workflow N8N.");
        return;
      }

      const startedAt = Date.now();
      const aspectRatioSnapshot = session.aspectRatio;
      setSession((prev) => ({
        ...prev,
        prompt,
        status: "generating",
        startedAt,
        resultUrl: null,
        error: null,
        jobId: null,
      }));
      setElapsedSeconds(0);

      try {
        const result = await generateImage.mutateAsync({
          prompt,
          aspectRatio: aspectRatioSnapshot as
            | "1:1"
            | "4:5"
            | "3:4"
            | "16:9"
            | "9:16",
        });
        setSession((prev) => ({
          ...prev,
          status: "idle",
          startedAt: null,
          resultUrl: result.url,
          error: null,
          jobId: result.requestId,
        }));
        // Refresh server-side history supaya entry baru muncul instan.
        await utils.tools.listMyHistory.invalidate({ kind });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Generate gagal — coba lagi.";
        setSession((prev) => ({
          ...prev,
          status: "error",
          startedAt: null,
          resultUrl: null,
          error: message,
          jobId: null,
        }));
        toast.error(message);
        // Tetap invalidate karena backend mungkin mencatat row error.
        await utils.tools.listMyHistory.invalidate({ kind });
      }
    },
    [
      session.prompt,
      session.status,
      session.aspectRatio,
      kind,
      generateImage,
      utils,
    ],
  );

  const onDeleteHistory = useCallback(
    async (id: number) => {
      try {
        await deleteEntry.mutateAsync({ id });
        await utils.tools.listMyHistory.invalidate({ kind });
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Gagal menghapus entri.",
        );
      }
    },
    [deleteEntry, utils, kind],
  );

  const onSaveHistory = useCallback(
    (entry: HistoryEntry) => {
      if (!entry.resultUrl) {
        toast.info("Hasil belum tersedia untuk disimpan.");
        return;
      }
      const anchor = document.createElement("a");
      anchor.href = entry.resultUrl;
      anchor.download = `${kind}-${entry.id}.${kind === "image" ? "png" : "mp4"}`;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    },
    [kind],
  );

  const onReset = useCallback(() => {
    setSession(defaultSession(kind));
  }, [kind]);

  const isGenerating = session.status === "generating";

  return (
    <article className="flex flex-col border-(--line) bg-(--background)">
      <header className="screen-line-bottom flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden
            className="grid size-7 place-items-center border border-(--line) text-(--foreground)"
          >
            <Icon className="size-3.5" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold tracking-tight">
              {copy.title}
              <sup className="ml-1 text-[10px] font-medium tracking-normal text-(--muted-foreground)">
                {copy.sup}
              </sup>
            </h3>
            <p className="line-clamp-1 font-mono text-[10px] tracking-[0.16em] text-(--muted-foreground) uppercase">
              {kind === "image" ? "Image · N8N" : "Video · N8N"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.18em] text-(--muted-foreground) uppercase">
          <span
            className={cn(
              "size-1.5 rounded-full",
              isGenerating
                ? "bg-amber-500"
                : session.status === "error"
                  ? "bg-rose-500"
                  : "bg-emerald-500",
            )}
          />
          {isGenerating
            ? "running"
            : session.status === "error"
              ? "error"
              : "ready"}
        </div>
      </header>

      <div className="px-4 py-4">
        <p className="font-mono text-xs leading-6 text-(--muted-foreground)">
          {copy.description}
        </p>
      </div>

      <div className="screen-line-top px-4 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-4">
          <div className="flex items-start justify-center lg:flex-1">
            <motion.div
              layout
              transition={{
                type: "spring",
                stiffness: 320,
                damping: 32,
              }}
              className="relative"
              style={buildPreviewStyle(session.aspectRatio, kind)}
            >
              <AnimatePresence mode="wait" initial={false}>
                {isGenerating ? (
                  <motion.div
                    key="generating"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="absolute inset-0"
                  >
                    <GeneratingAnimation
                      label={copy.workingLabel}
                      startedAt={session.startedAt}
                    />
                  </motion.div>
                ) : session.resultUrl ? (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.25 }}
                    className="absolute inset-0 overflow-hidden border border-(--line)"
                  >
                    {/* Placeholder — integrasi nyata akan render <Image>/<video> */}
                    <div className="absolute inset-0 grid place-items-center font-mono text-[11px] tracking-[0.18em] uppercase text-(--muted-foreground)">
                      result · {session.jobId ?? "—"}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 border border-dashed border-(--line) bg-(--muted)/20"
                  >
                    <div className="absolute inset-0 grid place-items-center gap-1 text-center font-mono text-[10px] tracking-[0.2em] uppercase text-(--muted-foreground)">
                      output preview · {session.aspectRatio}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          <HistoryPanel
            kind={kind}
            entries={history}
            onDelete={onDeleteHistory}
            onSave={onSaveHistory}
            isLoading={historyQuery.isPending}
          />
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="screen-line-top flex flex-col gap-3 px-4 py-4"
      >
        <fieldset
          disabled={isGenerating}
          className="flex flex-col gap-2 disabled:cursor-not-allowed"
        >
          <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.2em] uppercase text-(--muted-foreground)">
            <span id={`aspect-label-${kind}`}>Aspect Ratio</span>
            <span className="tabular-nums">{session.aspectRatio}</span>
          </div>
          <div
            role="radiogroup"
            aria-labelledby={`aspect-label-${kind}`}
            aria-disabled={isGenerating}
            className="flex flex-wrap gap-1"
          >
            {aspectOptions.map((option) => {
              const active = session.aspectRatio === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  tabIndex={active ? 0 : -1}
                  onClick={() => setAspectRatio(option.value)}
                  disabled={isGenerating}
                  className={cn(
                    "inline-flex h-7 min-w-12 items-center justify-center border px-2 font-mono text-[10px] tracking-[0.12em] uppercase transition-colors",
                    active
                      ? "border-(--foreground) bg-(--foreground) text-(--background)"
                      : "border-(--line) text-(--muted-foreground) hover:border-(--foreground)/40 hover:text-(--foreground)",
                    "disabled:pointer-events-none disabled:opacity-50",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <label
          htmlFor={`prompt-${kind}`}
          className="flex items-center justify-between font-mono text-[10px] tracking-[0.2em] uppercase text-(--muted-foreground)"
        >
          <span>Prompt</span>
          <span className="tabular-nums">
            {session.prompt.length.toString().padStart(3, "0")} ch
          </span>
        </label>
        <Textarea
          id={`prompt-${kind}`}
          value={session.prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={copy.placeholder}
          rows={3}
          disabled={isGenerating}
          className="resize-none font-mono text-xs leading-6"
        />

        <div className="flex items-center justify-between gap-2">
          <div className="font-mono text-[10px] tracking-[0.18em] text-(--muted-foreground) uppercase">
            {isGenerating && elapsedSeconds
              ? `elapsed ${elapsedSeconds}s`
              : "ready to dispatch"}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onReset}
              disabled={isGenerating || !session.prompt}
              className="h-8 px-2 font-mono text-[11px] tracking-wide"
            >
              <RotateCcw className="size-3.5" />
              Reset
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isGenerating || !session.prompt.trim()}
              className="h-8 gap-1.5 px-3 font-mono text-[11px] tracking-wide"
            >
              <Send className="size-3.5" />
              {isGenerating ? "Running…" : copy.submitLabel}
            </Button>
          </div>
        </div>
      </form>
    </article>
  );
}
