"use client";

import { Image as ImageIcon, RotateCcw, Send, Video } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

import { GeneratingAnimation } from "./generating-animation";
import {
  HistoryPanel,
  type HistoryEntry,
  type VideoFrameTarget,
} from "./history-panel";
import { ImageDropzone, type ImageFile } from "./image-dropzone";
import {
  MediaExpandModal,
  type MediaExpandTarget,
} from "./media-expand-modal";
import { REFERENCE_SLOTS, ReferenceRail } from "./reference-rail";
import { getProxiedVideoUrl } from "../lib/video-proxy";

export type GenerateKind = "image" | "video";

type Status = "idle" | "generating" | "success" | "error";

type AspectOption = {
  label: string;
  value: string;
  ratio: number;
  // Untuk video: ratio yang belum didukung Veo 3 tetap ditampilkan tapi disabled.
  disabled?: boolean;
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
  // Untuk video: row id di tool_generation untuk polling getVideoStatus.
  rowId: number | null;
  // Untuk video image-to-video: dua frame referensi.
  firstFrame: ImageFile | null;
  lastFrame: ImageFile | null;
  // Untuk image: maks 6 referensi yang bisa di-tag via @1..@6 di prompt.
  references: (ImageFile | null)[];
};

const STORAGE_PREFIX = "porto.tools.session";
const VIDEO_HISTORY_MODE_STORAGE_KEY = "porto.tools.videoHistoryMode";
const SESSION_TTL_MS = 1000 * 60 * 30; // 30 menit
const MAX_PERSISTED_FRAME_BYTES = 2 * 1024 * 1024; // skip persist frame > 2MB

const ASPECT_OPTIONS: Record<GenerateKind, ReadonlyArray<AspectOption>> = {
  image: [
    { label: "1:1", value: "1:1", ratio: 1 },
    { label: "4:5", value: "4:5", ratio: 4 / 5 },
    { label: "3:4", value: "3:4", ratio: 3 / 4 },
    { label: "16:9", value: "16:9", ratio: 16 / 9 },
    { label: "9:16", value: "9:16", ratio: 9 / 16 },
  ],
  // Veo 3 saat ini hanya support 16:9 dan 9:16. Ratio lain tampil tapi disabled.
  video: [
    { label: "16:9", value: "16:9", ratio: 16 / 9 },
    { label: "9:16", value: "9:16", ratio: 9 / 16 },
    { label: "1:1", value: "1:1", ratio: 1, disabled: true },
    { label: "4:3", value: "4:3", ratio: 4 / 3, disabled: true },
    { label: "21:9", value: "21:9", ratio: 21 / 9, disabled: true },
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
    rowId: null,
    firstFrame: null,
    lastFrame: null,
    references: Array.from({ length: REFERENCE_SLOTS }, () => null),
  };
}

function normalizeReferences(
  raw: unknown,
): (ImageFile | null)[] {
  const out: (ImageFile | null)[] = Array.from(
    { length: REFERENCE_SLOTS },
    () => null,
  );
  if (!Array.isArray(raw)) return out;
  for (let i = 0; i < REFERENCE_SLOTS; i++) {
    const entry = raw[i];
    if (entry && typeof entry === "object" && typeof (entry as ImageFile).base64 === "string") {
      out[i] = entry as ImageFile;
    }
  }
  return out;
}

function sanitizeFrameForPersist(frame: ImageFile | null): ImageFile | null {
  if (!frame) return null;
  // Skip persist kalau gambar besar — base64 di localStorage cepat kena quota.
  if (frame.base64.length > MAX_PERSISTED_FRAME_BYTES) return null;
  return frame;
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
      rowId: parsed.rowId ?? null,
      firstFrame: parsed.firstFrame ?? null,
      lastFrame: parsed.lastFrame ?? null,
      references: normalizeReferences((parsed as { references?: unknown }).references),
    };
  } catch {
    return fallback;
  }
}

function writeSession(kind: GenerateKind, session: PersistedSession) {
  if (typeof window === "undefined") return;
  try {
    const safe: PersistedSession = {
      ...session,
      firstFrame: sanitizeFrameForPersist(session.firstFrame),
      lastFrame: sanitizeFrameForPersist(session.lastFrame),
      // Cap each reference image; skip oversize via sanitize. Slot tetap di-preserve
      // sebagai null agar index (badge nomor & tag @N) stabil di-reload.
      references: session.references.map((r) => sanitizeFrameForPersist(r)),
    };
    window.localStorage.setItem(
      `${STORAGE_PREFIX}.${kind}`,
      JSON.stringify({ ...safe, savedAt: Date.now() }),
    );
  } catch {
    // quota exceeded / private mode — silently ignore
  }
}

function readVideoHistoryMode(): GenerateKind {
  if (typeof window === "undefined") return "video";
  try {
    const raw = window.localStorage.getItem(VIDEO_HISTORY_MODE_STORAGE_KEY);
    return raw === "image" ? "image" : "video";
  } catch {
    return "video";
  }
}

function writeVideoHistoryMode(mode: GenerateKind) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(VIDEO_HISTORY_MODE_STORAGE_KEY, mode);
  } catch {
    // ignore quota errors
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
      "Upload First Frame (wajib) + End Frame (opsional). Caption opsional. Veo 3 render klip 8 detik. Estimasi 1–5 menit.",
    placeholder:
      "Opsional — caption singkat: contoh kamera dolly-in perlahan di lorong studio, lighting kontras tinggi, gerakan halus...",
    icon: Video,
    submitLabel: "Generate",
    workingLabel: "Rendering Veo",
  },
};

// Proxy video ke /api/video agar browser bisa range-request (seek + stream)
// tanpa CORS issue — semua request melewati origin frontend.
function buildPreviewStyle(value: string, kind: GenerateKind): React.CSSProperties {
  const aspect = findAspect(kind, value);
  // width = min(100%, 28rem, calc(60vh * ratio)) menjaga agar height tidak
  // pernah melebihi ~60vh sekaligus tetap menghormati aspect-ratio asli.
  return {
    aspectRatio: aspect.value.replace(":", " / "),
    width: `min(100%, 28rem, calc(60vh * ${aspect.ratio}))`,
  };
}

async function historyEntryToImageFile(entry: HistoryEntry): Promise<ImageFile> {
  if (!entry.resultUrl) throw new Error("Hasil belum tersedia");
  // Lewat proxy /api/download untuk menghindari CORS saat fetch blob.
  const proxied = `/api/download?url=${encodeURIComponent(entry.resultUrl)}`;
  const res = await fetch(proxied);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const mime = (blob.type || "image/png") as ImageFile["mimeType"];
  if (
    mime !== "image/jpeg" &&
    mime !== "image/png" &&
    mime !== "image/webp"
  ) {
    throw new Error("Format tidak didukung sebagai frame");
  }
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca blob"));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const fileName = `history-${entry.id}.${mime.split("/")[1]}`;
  return { base64, mimeType: mime, dataUrl, fileName };
}

function VideoFrameRail({
  firstFrame,
  lastFrame,
  onFirstFrameChange,
  onLastFrameChange,
  disabled,
}: {
  firstFrame: ImageFile | null;
  lastFrame: ImageFile | null;
  onFirstFrameChange: (frame: ImageFile | null) => void;
  onLastFrameChange: (frame: ImageFile | null) => void;
  disabled: boolean;
}) {
  const filledCount = firstFrame ? (lastFrame ? 2 : 1) : 0;

  return (
    <aside
      aria-label="Reference frames video"
      className="flex w-full flex-col border border-(--line) bg-(--background) lg:w-52"
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-(--line) px-3 py-2.5">
        <span className="font-mono text-[10px] tracking-[0.2em] text-(--muted-foreground) uppercase">
          Frames
        </span>
        <span className="font-mono text-[10px] tabular-nums text-(--muted-foreground)">
          {filledCount.toString().padStart(2, "0")}/02
        </span>
      </header>

      <div className="grid grid-cols-2 gap-2 p-2 lg:grid-cols-1">
        <ImageDropzone
          label="First"
          value={firstFrame}
          onChange={onFirstFrameChange}
          disabled={disabled}
        />
        <ImageDropzone
          label="End"
          value={lastFrame}
          onChange={onLastFrameChange}
          disabled={disabled}
          optional
        />
      </div>
    </aside>
  );
}

type GenerateCardProps = {
  kind: GenerateKind;
};

type HistoryRow = {
  id: number;
  status: string;
  fileUrl: string | null;
  createdAt: unknown;
  prompt: string;
  aspectRatio: string;
};

function mapHistoryRows(rows: readonly HistoryRow[]): HistoryEntry[] {
  return rows
    .filter((row) => row.status === "success" && row.fileUrl)
    .map((row) => {
      const ts = new Date(row.createdAt as string).getTime();
      return {
        id: row.id,
        createdAt: Number.isFinite(ts) ? ts : 0,
        prompt: row.prompt,
        aspectRatio: row.aspectRatio,
        resultUrl: row.fileUrl,
      };
    });
}

export function GenerateCard({ kind }: GenerateCardProps) {
  const copy = COPY[kind];
  const Icon = copy.icon;
  const aspectOptions = ASPECT_OPTIONS[kind];

  const utils = trpc.useUtils();
  const historyQuery = trpc.tools.listMyHistory.useQuery({ kind });
  const imageHistoryForVideoQuery = trpc.tools.listMyHistory.useQuery(
    { kind: "image" },
    { enabled: kind === "video" },
  );
  const generateImage = trpc.tools.generateImage.useMutation();
  const generateVideo = trpc.tools.generateVideo.useMutation();
  const deleteEntry = trpc.tools.deleteMyEntry.useMutation();

  const history = useMemo<HistoryEntry[]>(() => {
    return mapHistoryRows(historyQuery.data ?? []);
  }, [historyQuery.data]);

  const imageHistoryForVideo = useMemo<HistoryEntry[]>(() => {
    return mapHistoryRows(imageHistoryForVideoQuery.data ?? []);
  }, [imageHistoryForVideoQuery.data]);

  const [session, setSession] = useState<PersistedSession>(() =>
    defaultSession(kind),
  );
  const [videoHistoryMode, setVideoHistoryMode] =
    useState<GenerateKind>("video");
  const [hasMounted, setHasMounted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number | null>(null);
  const [addingReferenceId, setAddingReferenceId] = useState<number | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<Record<number, number>>({});

  useEffect(() => {
    // Hidrasi state dari localStorage pasca-mount; tidak bisa di-init di
    // useState karena localStorage tidak tersedia saat SSR.
    setSession(readSession(kind));
    if (kind === "video") setVideoHistoryMode(readVideoHistoryMode());
    setHasMounted(true);
  }, [kind]);

  useEffect(() => {
    if (!hasMounted) return;
    writeSession(kind, session);
  }, [kind, session, hasMounted]);

  useEffect(() => {
    if (!hasMounted || kind !== "video") return;
    writeVideoHistoryMode(videoHistoryMode);
  }, [kind, videoHistoryMode, hasMounted]);

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

  const setFirstFrame = useCallback((frame: ImageFile | null) => {
    setSession((prev) =>
      prev.status === "generating" ? prev : { ...prev, firstFrame: frame },
    );
  }, []);

  const setLastFrame = useCallback((frame: ImageFile | null) => {
    setSession((prev) =>
      prev.status === "generating" ? prev : { ...prev, lastFrame: frame },
    );
  }, []);

  const setReference = useCallback(
    (index: number, frame: ImageFile | null) => {
      setSession((prev) => {
        if (prev.status === "generating") return prev;
        const next = prev.references.slice();
        next[index] = frame;
        return { ...prev, references: next };
      });
    },
    [],
  );

  const addAsReference = useCallback(
    async (entry: HistoryEntry) => {
      if (!entry.resultUrl) {
        toast.info("Hasil belum tersedia.");
        return;
      }
      if (session.status === "generating") {
        toast.info("Tunggu proses generate selesai.");
        return;
      }
      if (addingReferenceId !== null) {
        toast.info("Sedang menambahkan referensi.");
        return;
      }

      // Cek ketersediaan slot sebelum async — ini adalah ground-truth pre-check.
      const emptySlot = session.references.findIndex((ref) => ref === null);
      if (emptySlot < 0) {
        toast.info("Semua slot referensi sudah terisi");
        return;
      }

      setAddingReferenceId(entry.id);
      try {
        const file = await historyEntryToImageFile(entry);

        // Gunakan functional update agar selalu membaca state terbaru (prev),
        // bukan closure — menghindari race condition di React 18 concurrent mode.
        setSession((prev) => {
          if (prev.status === "generating") return prev;
          const next = prev.references.slice();
          const emptyIdx = next.findIndex((r) => r === null);
          if (emptyIdx < 0) return prev;
          next[emptyIdx] = file;
          return { ...prev, references: next };
        });
        // Pre-check sudah memastikan ada slot kosong, jadi toast selalu success.
        toast.success(`Ditambahkan sebagai referensi #${emptySlot + 1}`);
      } catch (err) {
        toast.error(
          err instanceof Error
            ? `Gagal menambah referensi: ${err.message}`
            : "Gagal menambah referensi",
        );
      } finally {
        setAddingReferenceId(null);
      }
    },
    [addingReferenceId, session.references, session.status],
  );

  const addHistoryImageToVideoFrame = useCallback(
    async (entry: HistoryEntry, target: VideoFrameTarget) => {
      if (!entry.resultUrl) {
        toast.info("Hasil belum tersedia.");
        return;
      }
      if (session.status === "generating") {
        toast.info("Tunggu proses generate selesai.");
        return;
      }
      if (addingReferenceId !== null) {
        toast.info("Sedang menambahkan frame.");
        return;
      }

      setAddingReferenceId(entry.id);
      try {
        const file = await historyEntryToImageFile(entry);
        let applied = false;
        setSession((prev) => {
          if (prev.status === "generating") return prev;
          applied = true;
          return target === "first"
            ? { ...prev, firstFrame: file }
            : { ...prev, lastFrame: file };
        });
        if (applied) {
          toast.success(
            target === "first" ? "Masuk ke First Frame" : "Masuk ke End Frame",
          );
        } else {
          toast.info("Tunggu proses generate selesai.");
        }
      } catch (err) {
        toast.error(
          err instanceof Error
            ? `Gagal menambah frame: ${err.message}`
            : "Gagal menambah frame",
        );
      } finally {
        setAddingReferenceId(null);
      }
    },
    [addingReferenceId, session.status],
  );

  const [expandTarget, setExpandTarget] = useState<MediaExpandTarget | null>(
    null,
  );

  const onExpandHistory = useCallback(
    (entry: HistoryEntry, targetKind: GenerateKind = kind) => {
      if (!entry.resultUrl) return;
      setExpandTarget({
        kind: targetKind,
        url: entry.resultUrl,
        prompt: entry.prompt,
        aspectRatio: entry.aspectRatio,
      });
    },
    [kind],
  );

  const onExpandReference = useCallback(
    (file: ImageFile, index: number) => {
      setExpandTarget({
        kind: "image",
        url: file.dataUrl,
        prompt: `Referensi #${index + 1} — ${file.fileName}`,
      });
    },
    [],
  );

  // ====== @-mention state & helpers untuk Generate Image ======
  // Memungkinkan user tag referensi via `@N` (N = 1..6). Popover muncul saat
  // mengetik `@` lalu menampilkan referensi yang ter-isi; pilih untuk
  // menyisipkan `@<id> ` pada posisi caret.
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [mention, setMention] = useState<{
    open: boolean;
    activeIndex: number;
    tokenStart: number;
    tokenEnd: number;
    query: string;
  }>({ open: false, activeIndex: 0, tokenStart: 0, tokenEnd: 0, query: "" });

  const filledReferences = useMemo(
    () =>
      session.references
        .map((file, idx) => (file ? { file, idx } : null))
        .filter((v): v is { file: ImageFile; idx: number } => v !== null),
    [session.references],
  );

  const mentionCandidates = useMemo(() => {
    if (!mention.open) return [];
    const q = mention.query.trim();
    if (!q) return filledReferences;
    return filledReferences.filter((ref) =>
      String(ref.idx + 1).startsWith(q),
    );
  }, [mention.open, mention.query, filledReferences]);

  const closeMention = useCallback(() => {
    setMention((prev) => (prev.open ? { ...prev, open: false } : prev));
  }, []);

  const detectMention = useCallback(
    (value: string, caret: number) => {
      if (kind !== "image") return;
      const before = value.slice(0, caret);
      const match = before.match(/@(\d*)$/);
      if (!match) {
        closeMention();
        return;
      }
      const tokenStart = caret - match[0].length;
      setMention({
        open: true,
        activeIndex: 0,
        tokenStart,
        tokenEnd: caret,
        query: match[1] ?? "",
      });
    },
    [kind, closeMention],
  );

  const insertMention = useCallback(
    (refIndex: number) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const value = ta.value;
      const before = value.slice(0, mention.tokenStart);
      const after = value.slice(mention.tokenEnd);
      const insertion = `@${refIndex + 1} `;
      const next = before + insertion + after;
      const nextCaret = before.length + insertion.length;
      setPrompt(next);
      closeMention();
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(nextCaret, nextCaret);
      });
    },
    [mention.tokenStart, mention.tokenEnd, setPrompt, closeMention],
  );

  const onPromptChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = event.target.value;
      setPrompt(value);
      detectMention(value, event.target.selectionStart ?? value.length);
    },
    [setPrompt, detectMention],
  );

  const onPromptKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!mention.open || mentionCandidates.length === 0) {
        if (mention.open && event.key === "Escape") {
          event.preventDefault();
          closeMention();
        }
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setMention((prev) => ({
          ...prev,
          activeIndex: (prev.activeIndex + 1) % mentionCandidates.length,
        }));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setMention((prev) => ({
          ...prev,
          activeIndex:
            (prev.activeIndex - 1 + mentionCandidates.length) %
            mentionCandidates.length,
        }));
      } else if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        const pick = mentionCandidates[mention.activeIndex];
        if (pick) insertMention(pick.idx);
      } else if (event.key === "Escape") {
        event.preventDefault();
        closeMention();
      } else if (event.key === " ") {
        // Spasi menutup popover, biarkan default karakter ter-input.
        closeMention();
      }
    },
    [mention.open, mention.activeIndex, mentionCandidates, insertMention, closeMention],
  );

  const onPromptSelect = useCallback(
    (event: React.SyntheticEvent<HTMLTextAreaElement>) => {
      const target = event.currentTarget;
      detectMention(target.value, target.selectionStart ?? target.value.length);
    },
    [detectMention],
  );

  // Polling status video saat status=generating untuk kind=video.
  const shouldPollVideo =
    kind === "video" && session.status === "generating" && session.rowId !== null;
  const videoStatusQuery = trpc.tools.getVideoStatus.useQuery(
    { id: session.rowId ?? 0 },
    {
      enabled: shouldPollVideo,
      refetchInterval: shouldPollVideo ? 10_000 : false,
      refetchOnWindowFocus: false,
      // Penting: jangan retry agresif kalau request gagal — biar 10s tick berikut yang retry.
      retry: false,
    },
  );

  const videoTransientMessage =
    kind === "video" &&
    videoStatusQuery.data?.status === "pending" &&
    "transientError" in videoStatusQuery.data
      ? videoStatusQuery.data.transientError
      : null;

  useEffect(() => {
    if (!shouldPollVideo) return;
    const data = videoStatusQuery.data;
    if (!data) return;
    if (data.status === "success" && data.url) {
      // Polling tRPC adalah sumber eksternal — kita sinkronkan ke state lokal.
      setSession((prev) => ({
        ...prev,
        status: "idle",
        startedAt: null,
        resultUrl: data.url ?? null,
        error: null,
      }));
      void utils.tools.listMyHistory.invalidate({ kind });
    } else if (data.status === "error") {
      const message = data.error ?? "Generate video gagal";
      setSession((prev) => ({
        ...prev,
        status: "error",
        startedAt: null,
        resultUrl: null,
        error: message,
      }));
      toast.error(message);
      void utils.tools.listMyHistory.invalidate({ kind });
    }
  }, [shouldPollVideo, videoStatusQuery.data, utils, kind]);

  // Bug-fix: bila polling status video gagal permanen (mis. 403/404 karena sesi
  // kedaluwarsa atau row dihapus), reset UI dari "generating" agar tidak terkunci
  // selamanya. retry:false memastikan error muncul tanpa retry beruntun.
  useEffect(() => {
    if (!shouldPollVideo) return;
    if (!videoStatusQuery.error) return;
    const message =
      "Gagal memantau status video — sesi mungkin kedaluwarsa. Coba generate ulang.";
    setSession((prev) => ({
      ...prev,
      status: "error",
      startedAt: null,
      resultUrl: null,
      error: message,
    }));
    toast.error(message);
  }, [shouldPollVideo, videoStatusQuery.error]);

  const onSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const prompt = session.prompt.trim();
      if (session.status === "generating") return;

      if (kind === "image") {
        if (!prompt) {
          toast.error("Prompt tidak boleh kosong");
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
          rowId: null,
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
            references: session.references
              .filter((r): r is ImageFile => r !== null)
              .map((r) => ({ base64: r.base64, mimeType: r.mimeType })),
          });
          setSession((prev) => ({
            ...prev,
            status: "idle",
            startedAt: null,
            resultUrl: result.url,
            error: null,
            jobId: result.requestId,
          }));
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
          await utils.tools.listMyHistory.invalidate({ kind });
        }
        return;
      }

      // kind === "video"
      const firstFrame = session.firstFrame;
      if (!firstFrame) {
        toast.error("Upload minimal First Frame untuk image-to-video");
        return;
      }
      const lastFrame = session.lastFrame;

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
        rowId: null,
      }));
      setElapsedSeconds(0);

      try {
        const result = await generateVideo.mutateAsync({
          prompt,
          aspectRatio: aspectRatioSnapshot as "16:9" | "9:16",
          firstFrame: {
            base64: firstFrame.base64,
            mimeType: firstFrame.mimeType,
          },
          lastFrame: lastFrame
            ? { base64: lastFrame.base64, mimeType: lastFrame.mimeType }
            : undefined,
        });
        // Tetap "generating" — useEffect polling yang akan flip ke success/error.
        setSession((prev) => ({
          ...prev,
          jobId: result.jobId,
          rowId: result.id,
        }));
        await utils.tools.listMyHistory.invalidate({ kind });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Generate video gagal — coba lagi.";
        setSession((prev) => ({
          ...prev,
          status: "error",
          startedAt: null,
          resultUrl: null,
          error: message,
          jobId: null,
          rowId: null,
        }));
        toast.error(message);
        await utils.tools.listMyHistory.invalidate({ kind });
      }
    },
    [
      session.prompt,
      session.status,
      session.aspectRatio,
      session.firstFrame,
      session.lastFrame,
      session.references,
      kind,
      generateImage,
      generateVideo,
      utils,
    ],
  );

  const onDeleteHistory = useCallback(
    async (id: number, historyKind: GenerateKind = kind) => {
      try {
        await deleteEntry.mutateAsync({ id });
        await utils.tools.listMyHistory.invalidate({ kind: historyKind });
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Gagal menghapus entri.",
        );
      }
    },
    [deleteEntry, utils, kind],
  );

  const onSaveHistory = useCallback(
    async (entry: HistoryEntry, historyKind: GenerateKind = kind) => {
      if (!entry.resultUrl) {
        toast.info("Hasil belum tersedia untuk disimpan.");
        return;
      }
      // Jangan duplikasi download yang sudah berjalan untuk entry yang sama.
      if (downloadProgress[entry.id] !== undefined) return;

      const ext = historyKind === "image" ? "png" : "mp4";
      const fileName = `${historyKind}-${entry.id}.${ext}`;

      const clearProgress = (id: number) => {
        setDownloadProgress((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      };

      try {
        const proxied = `/api/download?url=${encodeURIComponent(
          entry.resultUrl,
        )}&filename=${encodeURIComponent(fileName)}`;

        setDownloadProgress((prev) => ({ ...prev, [entry.id]: 0 }));

        const res = await fetch(proxied);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const contentLength = res.headers.get("Content-Length");
        const total = contentLength ? parseInt(contentLength, 10) : null;

        let blob: Blob;

        if (total && total > 0 && res.body) {
          // Stream dengan progress — aktif saat Content-Length tersedia.
          const reader = res.body.getReader();
          const chunks: BlobPart[] = [];
          let loaded = 0;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            loaded += value.length;
            const pct = Math.min(99, Math.round((loaded / total) * 100));
            setDownloadProgress((prev) => ({ ...prev, [entry.id]: pct }));
          }
          blob = new Blob(chunks);
        } else {
          // Fallback tanpa streaming progress — tampilkan indeterminate (0%).
          blob = await res.blob();
        }

        // Selesai — setel ke 100 sesaat sebelum hapus overlay.
        setDownloadProgress((prev) => ({ ...prev, [entry.id]: 100 }));

        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = fileName;
        anchor.rel = "noopener";
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);

        // Hapus overlay progress setelah sebentar agar user sempat lihat "100%".
        setTimeout(() => clearProgress(entry.id), 1200);
      } catch (err) {
        clearProgress(entry.id);
        toast.error(
          err instanceof Error
            ? `Gagal mengunduh: ${err.message}`
            : "Gagal mengunduh file",
        );
      }
    },
    [kind, downloadProgress],
  );

  const onReset = useCallback(() => {
    setSession(defaultSession(kind));
  }, [kind]);

  const isGenerating = session.status === "generating";
  const historyPanelKind =
    kind === "video" && videoHistoryMode === "image" ? "image" : kind;
  const historyPanelEntries =
    historyPanelKind === "image" && kind === "video"
      ? imageHistoryForVideo
      : history;
  const historyPanelIsLoading =
    historyPanelKind === "image" && kind === "video"
      ? imageHistoryForVideoQuery.isPending
      : historyQuery.isPending;
  const historyModeToggle =
    kind === "video" ? (
      <div
        role="group"
        aria-label="Mode history"
        className="inline-flex border border-(--line)"
      >
        {([
          { value: "video" as const, label: "History video", icon: Video },
          { value: "image" as const, label: "History image", icon: ImageIcon },
        ]).map(({ value, label, icon: ModeIcon }) => {
          const active = videoHistoryMode === value;
          return (
            <button
              key={value}
              type="button"
              aria-label={label}
              title={label}
              aria-pressed={active}
              onClick={() => setVideoHistoryMode(value)}
              className={cn(
                "inline-flex size-6 items-center justify-center text-(--muted-foreground) transition-colors [&+button]:border-l [&+button]:border-(--line)",
                active
                  ? "bg-(--foreground) text-(--background)"
                  : "hover:text-(--foreground)",
              )}
            >
              <ModeIcon className="size-3" aria-hidden />
            </button>
          );
        })}
      </div>
    ) : null;
  const latestHistoryEntry = history[0] ?? null;
  const previewEntry =
    session.resultUrl !== null
      ? {
          resultUrl: session.resultUrl,
          prompt: session.prompt,
          aspectRatio: session.aspectRatio,
          source: "session",
        }
      : latestHistoryEntry
        ? {
            resultUrl: latestHistoryEntry.resultUrl,
            prompt: latestHistoryEntry.prompt,
            aspectRatio: latestHistoryEntry.aspectRatio,
            source: `history-${latestHistoryEntry.id}`,
          }
        : null;
  // Ukuran container preview selalu mengikuti aspect ratio yang DIPILIH user,
  // bukan aspect ratio hasil lama — agar preview langsung update saat diubah.
  const previewAspectRatio = session.aspectRatio;

  return (
    <article className="flex h-full min-w-0 min-h-0 flex-col border-(--line) bg-(--background)">
      <header className="screen-line-bottom shrink-0 flex min-w-0 items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden
            className="grid size-7 shrink-0 place-items-center border border-(--line) text-(--foreground)"
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

      <div className="shrink-0 px-4 py-4">
        <p className="font-mono text-xs leading-6 text-(--muted-foreground)">
          {copy.description}
        </p>
      </div>

      <div className="screen-line-top min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4">
        <div className="flex min-h-full min-w-0 flex-col gap-4">
          <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:gap-4">
            {kind === "image" ? (
              <ReferenceRail
                values={session.references}
                onChange={setReference}
                onExpand={onExpandReference}
                disabled={isGenerating}
              />
            ) : (
              <VideoFrameRail
                firstFrame={session.firstFrame}
                lastFrame={session.lastFrame}
                onFirstFrameChange={setFirstFrame}
                onLastFrameChange={setLastFrame}
                disabled={isGenerating}
              />
            )}
            <div className="flex min-w-0 items-start justify-center lg:flex-1">
              <motion.div
                layout
                transition={{
                  type: "spring",
                  stiffness: 320,
                  damping: 32,
                }}
                className="relative"
                style={buildPreviewStyle(previewAspectRatio, kind)}
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
                  ) : previewEntry?.resultUrl ? (
                    <motion.div
                      key={`result-${previewEntry.source}-${previewEntry.resultUrl}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.25 }}
                      className="absolute inset-0 overflow-hidden border border-(--line)"
                    >
                      {kind === "image" ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={previewEntry.resultUrl}
                          alt={previewEntry.prompt || "Hasil generate"}
                          className="absolute inset-0 size-full object-cover"
                        />
                      ) : (
                        <video
                          key={previewEntry.resultUrl}
                          src={getProxiedVideoUrl(previewEntry.resultUrl)}
                          controls
                          preload="auto"
                          muted
                          playsInline
                          className="absolute inset-0 size-full object-cover"
                        />
                      )}
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
                        output preview · {previewAspectRatio}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>

            <HistoryPanel
              kind={historyPanelKind}
              entries={historyPanelEntries}
              onDelete={(id) => onDeleteHistory(id, historyPanelKind)}
              onSave={(entry) => onSaveHistory(entry, historyPanelKind)}
              onExpand={(entry) => onExpandHistory(entry, historyPanelKind)}
              onAddAsReference={kind === "image" ? addAsReference : undefined}
              onAddToVideoFrame={
                kind === "video" && historyPanelKind === "image"
                  ? addHistoryImageToVideoFrame
                  : undefined
              }
              addingReferenceId={addingReferenceId}
              downloadProgress={downloadProgress}
              isLoading={historyPanelIsLoading}
              modeToggle={historyModeToggle}
            />
          </div>

          <form
            onSubmit={onSubmit}
            className="screen-line-top flex flex-col gap-3 pt-4"
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
                  const unsupported = option.disabled === true;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      aria-disabled={unsupported || undefined}
                      title={unsupported ? "Belum didukung — segera hadir" : undefined}
                      tabIndex={active ? 0 : -1}
                      onClick={() => setAspectRatio(option.value)}
                      disabled={isGenerating || unsupported}
                      className={cn(
                        "inline-flex h-7 min-w-12 items-center justify-center border px-2 font-mono text-[10px] tracking-[0.12em] uppercase transition-colors",
                        active
                          ? "border-(--foreground) bg-(--foreground) text-(--background)"
                          : "border-(--line) text-(--muted-foreground) hover:border-(--foreground)/40 hover:text-(--foreground)",
                        unsupported &&
                          "line-through decoration-(--muted-foreground)/60",
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
              <span>{kind === "video" ? "Caption · optional" : "Prompt"}</span>
              <span className="tabular-nums">
                {session.prompt.length.toString().padStart(3, "0")} ch
              </span>
            </label>
            <div className="relative">
              <Textarea
                ref={textareaRef}
                id={`prompt-${kind}`}
                value={session.prompt}
                onChange={onPromptChange}
                onKeyDown={onPromptKeyDown}
                onSelect={onPromptSelect}
                onBlur={() => {
                  // Delay agar onClick di popover sempat terjadi sebelum tutup.
                  setTimeout(closeMention, 120);
                }}
                placeholder={copy.placeholder}
                rows={3}
                disabled={isGenerating}
                className="resize-none font-mono text-xs leading-6"
              />
              {kind === "image" && mention.open ? (
                mentionCandidates.length === 0 ? (
                  <div className="absolute top-full left-0 z-30 mt-1 w-64 max-w-full border border-(--line) bg-(--background) px-3 py-2 font-mono text-[10px] tracking-[0.14em] text-(--muted-foreground) uppercase">
                    Tidak ada referensi terisi
                  </div>
                ) : (
                  <ul
                    role="listbox"
                    aria-label="Pilih referensi"
                    className="absolute top-full left-0 z-30 mt-1 max-h-56 w-64 max-w-full overflow-y-auto border border-(--line) bg-(--background) shadow-sm"
                  >
                    {mentionCandidates.map((ref, i) => {
                      const active = i === mention.activeIndex;
                      return (
                        <li key={ref.idx}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={active}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              insertMention(ref.idx);
                            }}
                            onMouseEnter={() =>
                              setMention((prev) => ({ ...prev, activeIndex: i }))
                            }
                            className={cn(
                              "flex w-full items-center gap-2 px-2 py-1.5 text-left font-mono text-[11px] transition-colors",
                              active
                                ? "bg-(--foreground) text-(--background)"
                                : "text-(--foreground) hover:bg-(--muted)/60",
                            )}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={ref.file.dataUrl}
                              alt=""
                              className="size-6 shrink-0 border border-(--line) object-cover"
                            />
                            <span className="font-semibold tabular-nums">
                              @{ref.idx + 1}
                            </span>
                            <span className="line-clamp-1 text-[10px] opacity-80">
                              {ref.file.fileName}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="font-mono text-[10px] tracking-[0.18em] text-(--muted-foreground) uppercase">
                {videoTransientMessage
                  ? "veo busy · retrying"
                  : isGenerating && elapsedSeconds
                    ? `elapsed ${elapsedSeconds}s`
                    : "ready to dispatch"}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onReset}
                  disabled={
                    isGenerating ||
                    (kind === "image"
                      ? !session.prompt
                      : !session.prompt &&
                        !session.firstFrame &&
                        !session.lastFrame)
                  }
                  className="h-8 px-2 font-mono text-[11px] tracking-wide"
                >
                  <RotateCcw className="size-3.5" />
                  Reset
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={
                    isGenerating ||
                    (kind === "image"
                      ? !session.prompt.trim()
                      : !session.firstFrame)
                  }
                  className="h-8 gap-1.5 px-3 font-mono text-[11px] tracking-wide"
                >
                  <Send className="size-3.5" />
                  {isGenerating ? "Running…" : copy.submitLabel}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>

        <MediaExpandModal
        open={expandTarget !== null}
        onOpenChange={(open) => {
          if (!open) setExpandTarget(null);
        }}
        target={expandTarget}
      />
    </article>
  );
}
