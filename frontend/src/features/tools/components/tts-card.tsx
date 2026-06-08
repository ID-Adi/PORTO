"use client";

import {
  Download,
  Import,
  Loader2,
  Mic2,
  Play,
  Plus,
  RotateCcw,
  Send,
  Trash2,
  Volume2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

import { GeneratingAnimation } from "./generating-animation";

type Status = "idle" | "generating" | "error";

type TtsSpeaker = {
  speaker: string;
  voiceName: string;
};

type TtsFormat = "wav" | "mp3";
type TtsProviderId = "gemini" | "vertex" | "openrouter";

type TtsSession = {
  provider: TtsProviderId;
  model: string;
  text: string;
  styleInstruction: string;
  speakers: TtsSpeaker[];
  format: TtsFormat;
  status: Status;
  startedAt: number | null;
  rowId: number | null;
  resultUrl: string | null;
  error: string | null;
};

type TtsHistoryEntry = {
  id: number;
  status: string;
  fileUrl: string | null;
  createdAt: unknown;
  prompt: string;
  mimeType: string | null;
  inputMeta: unknown;
  outputMeta: unknown;
};

type InputMeta = {
  model?: string;
  provider?: string;
  styleInstruction?: string;
  speakers?: TtsSpeaker[];
};

type TtsTokens = {
  total?: number;
  prompt?: number;
  output?: number;
};

type OutputMeta = {
  durationSeconds?: number;
  tokens?: TtsTokens;
};

function readTokens(value: unknown): TtsTokens | undefined {
  const record = readRecord(value);
  if (!record) return undefined;
  const num = (v: unknown) => (typeof v === "number" ? v : undefined);
  const t = { total: num(record.total), prompt: num(record.prompt), output: num(record.output) };
  return t.total === undefined && t.prompt === undefined && t.output === undefined
    ? undefined
    : t;
}

const STORAGE_KEY = "porto.tools.session.tts";
const SESSION_TTL_MS = 1000 * 60 * 30;
const MAX_SPEAKERS = 2;
const HISTORY_TITLE_MAX_CHARS = 64;

const PROVIDER_LABEL: Record<TtsProviderId, string> = {
  gemini: "Gemini",
  vertex: "Vertex AI",
  openrouter: "OpenRouter",
};

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function readInputMeta(value: unknown): InputMeta {
  const record = readRecord(value);
  if (!record) return {};
  const speakers = Array.isArray(record.speakers)
    ? record.speakers
        .map((entry) => {
          const item = readRecord(entry);
          if (!item) return null;
          const speaker = item.speaker;
          const voiceName = item.voiceName;
          return typeof speaker === "string" && typeof voiceName === "string"
            ? { speaker, voiceName }
            : null;
        })
        .filter((entry): entry is TtsSpeaker => entry !== null)
    : undefined;
  return {
    model: typeof record.model === "string" ? record.model : undefined,
    provider: typeof record.provider === "string" ? record.provider : undefined,
    styleInstruction:
      typeof record.styleInstruction === "string"
        ? record.styleInstruction
        : undefined,
    speakers,
  };
}

function readOutputMeta(value: unknown): OutputMeta {
  const record = readRecord(value);
  if (!record) return {};
  return {
    durationSeconds:
      typeof record.durationSeconds === "number"
        ? record.durationSeconds
        : undefined,
    tokens: readTokens(record.tokens),
  };
}

function defaultSpeakers(defaultVoice: string, voices: readonly string[]) {
  const secondVoice = voices.find((voice) => voice !== defaultVoice) ?? defaultVoice;
  return [
    { speaker: "Narrator", voiceName: defaultVoice },
    { speaker: "Guest", voiceName: secondVoice },
  ];
}

function defaultSession(
  defaultVoice = "Kore",
  voices: readonly string[] = ["Kore"],
): TtsSession {
  return {
    provider: "gemini",
    model: "",
    text: "",
    styleInstruction: "",
    speakers: defaultSpeakers(defaultVoice, voices),
    format: "wav",
    status: "idle",
    startedAt: null,
    rowId: null,
    resultUrl: null,
    error: null,
  };
}

function normalizeProvider(value: unknown): TtsProviderId {
  return value === "vertex" || value === "openrouter" ? value : "gemini";
}

function readSession(defaultVoice: string, voices: readonly string[]): TtsSession {
  if (typeof window === "undefined") return defaultSession(defaultVoice, voices);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSession(defaultVoice, voices);
    const parsed = JSON.parse(raw) as Partial<TtsSession> & { savedAt?: number };
    if (Date.now() - (parsed.savedAt ?? 0) > SESSION_TTL_MS) {
      return defaultSession(defaultVoice, voices);
    }
    const speakers =
      Array.isArray(parsed.speakers) && parsed.speakers.length > 0
        ? parsed.speakers
            .slice(0, MAX_SPEAKERS)
            .map((speaker) => ({
              speaker: speaker.speaker || "Speaker",
              voiceName: voices.includes(speaker.voiceName)
                ? speaker.voiceName
                : defaultVoice,
            }))
        : defaultSpeakers(defaultVoice, voices);

    // Resume: jika sebelumnya `generating` dan punya rowId, pertahankan status
    // agar polling getTtsStatus tersambung kembali setelah refresh/navigasi.
    const wasGenerating = parsed.status === "generating";
    const hasRow = typeof parsed.rowId === "number";
    const status: Status = wasGenerating
      ? hasRow
        ? "generating"
        : "idle"
      : parsed.status ?? "idle";

    return {
      provider: normalizeProvider(parsed.provider),
      model: typeof parsed.model === "string" ? parsed.model : "",
      text: parsed.text ?? "",
      styleInstruction: parsed.styleInstruction ?? "",
      speakers,
      format: parsed.format === "mp3" ? "mp3" : "wav",
      status,
      startedAt: wasGenerating && hasRow ? parsed.startedAt ?? Date.now() : null,
      rowId: hasRow ? (parsed.rowId as number) : null,
      resultUrl: parsed.resultUrl ?? null,
      error: parsed.error ?? null,
    };
  } catch {
    return defaultSession(defaultVoice, voices);
  }
}

function writeSession(session: TtsSession) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...session, savedAt: Date.now() }),
    );
  } catch {
    // localStorage can fail in private mode.
  }
}

function formatDate(value: unknown) {
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatHistoryTitle(prompt: string) {
  const title = prompt.trim() || "Untitled audio";
  if (title.length <= HISTORY_TITLE_MAX_CHARS) return title;
  return `${title.slice(0, HISTORY_TITLE_MAX_CHARS - 3).trimEnd()}...`;
}

function TtsSpeakerRail({
  speakers,
  voices,
  disabled,
  singleVoice,
  onChange,
  onPreview,
  previewingVoice,
}: {
  speakers: TtsSpeaker[];
  voices: readonly string[];
  disabled: boolean;
  singleVoice: boolean;
  onChange: (speakers: TtsSpeaker[]) => void;
  onPreview: (voiceName: string) => void;
  previewingVoice: string | null;
}) {
  function update(index: number, patch: Partial<TtsSpeaker>) {
    onChange(
      speakers.map((speaker, current) =>
        current === index ? { ...speaker, ...patch } : speaker,
      ),
    );
  }

  function addSpeaker() {
    if (speakers.length >= MAX_SPEAKERS) return;
    onChange([
      ...speakers,
      {
        speaker: `Speaker ${speakers.length + 1}`,
        voiceName: voices[speakers.length % voices.length] ?? "Kore",
      },
    ]);
  }

  function removeSpeaker(index: number) {
    if (speakers.length <= 1) return;
    onChange(speakers.filter((_, current) => current !== index));
  }

  return (
    <aside className="flex w-full flex-col border border-(--line) bg-(--background)">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-(--line) px-3 py-2.5">
        <span className="font-mono text-[10px] tracking-[0.2em] text-(--muted-foreground) uppercase">
          Speakers
        </span>
        <span className="font-mono text-[10px] tabular-nums text-(--muted-foreground)">
          {singleVoice
            ? "VOICE"
            : `${speakers.length.toString().padStart(2, "0")}/02`}
        </span>
      </header>

      <div className="grid gap-2 p-2">
        {(singleVoice ? speakers.slice(0, 1) : speakers).map((speaker, index) => (
          <div key={index} className="border border-(--line) p-2">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] tracking-[0.18em] text-(--muted-foreground) uppercase">
                {singleVoice ? "Voice" : index === 0 ? "Primary" : `Voice ${index + 1}`}
              </span>
              {!singleVoice ? (
                <button
                  type="button"
                  aria-label="Remove speaker"
                  disabled={disabled || speakers.length <= 1}
                  onClick={() => removeSpeaker(index)}
                  className="inline-flex size-5 items-center justify-center text-(--muted-foreground) transition-colors hover:text-(--foreground) disabled:pointer-events-none disabled:opacity-30"
                >
                  <X className="size-3" aria-hidden />
                </button>
              ) : null}
            </div>
            {!singleVoice ? (
              <Input
                value={speaker.speaker}
                disabled={disabled}
                onChange={(event) =>
                  update(index, { speaker: event.target.value })
                }
                className="mb-2 h-8 rounded-none border-(--line) font-mono text-[11px]"
                aria-label={`Speaker ${index + 1} label`}
              />
            ) : null}
            <div className="flex items-center gap-1.5">
              <Select
                value={speaker.voiceName}
                disabled={disabled}
                onValueChange={(voiceName) => update(index, { voiceName })}
              >
                <SelectTrigger className="h-8 w-full rounded-none border-(--line) font-mono text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-none border-(--line)">
                  {voices.map((voice) => (
                    <SelectItem key={voice} value={voice}>
                      {voice}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                type="button"
                aria-label={`Preview voice ${speaker.voiceName}`}
                title="Preview voice"
                disabled={previewingVoice !== null}
                onClick={() => onPreview(speaker.voiceName)}
                className="inline-flex size-8 shrink-0 items-center justify-center border border-(--line) text-(--muted-foreground) transition-colors hover:text-(--foreground) disabled:pointer-events-none disabled:opacity-40"
              >
                {previewingVoice === speaker.voiceName ? (
                  <Loader2 className="size-3 animate-spin" aria-hidden />
                ) : (
                  <Play className="size-3" aria-hidden />
                )}
              </button>
            </div>
          </div>
        ))}

        {!singleVoice ? (
          <button
            type="button"
            disabled={disabled || speakers.length >= MAX_SPEAKERS}
            onClick={addSpeaker}
            className="inline-flex h-9 items-center justify-center gap-2 border border-dashed border-(--line) font-mono text-[10px] tracking-[0.16em] text-(--muted-foreground) uppercase transition-colors hover:border-(--foreground) hover:text-(--foreground) disabled:pointer-events-none disabled:opacity-40"
          >
            <Plus className="size-3" aria-hidden />
            Add speaker
          </button>
        ) : null}
      </div>
    </aside>
  );
}

function TtsHistoryPanel({
  entries,
  onDelete,
  onLoad,
  isLoading,
}: {
  entries: TtsHistoryEntry[];
  onDelete: (id: number) => void;
  onLoad: (entry: TtsHistoryEntry) => void;
  isLoading: boolean;
}) {
  return (
    <aside className="flex h-full w-full flex-col border border-(--line) bg-(--background) lg:max-h-[70vh]">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-(--line) px-3 py-2.5">
        <span className="font-mono text-[10px] tracking-[0.2em] text-(--muted-foreground) uppercase">
          History
        </span>
        <span className="font-mono text-[10px] tabular-nums text-(--muted-foreground)">
          {entries.length.toString().padStart(2, "0")}
        </span>
      </header>

      <div className="min-h-36 flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="grid min-h-28 place-items-center font-mono text-[10px] tracking-[0.18em] text-(--muted-foreground) uppercase">
            Loading
          </div>
        ) : entries.length === 0 ? (
          <div className="grid min-h-28 place-items-center font-mono text-[10px] tracking-[0.18em] text-(--muted-foreground) uppercase">
            Belum ada riwayat
          </div>
        ) : (
          <div className="grid gap-2">
            {entries.map((entry) => {
              const inputMeta = readInputMeta(entry.inputMeta);
              const outputMeta = readOutputMeta(entry.outputMeta);
              const speakers = inputMeta.speakers ?? [];
              const fullTitle = entry.prompt.trim() || "Untitled audio";
              return (
                <div key={entry.id} className="overflow-hidden border border-(--line) p-2">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1 basis-0 overflow-hidden">
                      <div
                        title={fullTitle}
                        className="block w-full overflow-hidden text-xs font-medium text-ellipsis whitespace-nowrap"
                      >
                        {formatHistoryTitle(entry.prompt)}
                      </div>
                      <div className="mt-1 block w-full overflow-hidden font-mono text-[9px] tracking-[0.12em] text-ellipsis whitespace-nowrap text-(--muted-foreground) uppercase">
                        {inputMeta.model ?? "tts"} /{" "}
                        {outputMeta.durationSeconds
                          ? `${outputMeta.durationSeconds}s`
                          : entry.status}
                        {outputMeta.tokens?.total != null
                          ? ` / ${outputMeta.tokens.total.toLocaleString()} tok`
                          : ""}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        aria-label="Load to form"
                        title="Muat ke form"
                        onClick={() => onLoad(entry)}
                        className="inline-flex size-6 items-center justify-center border border-(--line) text-(--muted-foreground) transition-colors hover:text-(--foreground)"
                      >
                        <Import className="size-3" aria-hidden />
                      </button>
                      {entry.fileUrl ? (
                        <a
                          href={`/api/download?url=${encodeURIComponent(
                            entry.fileUrl,
                          )}&filename=${encodeURIComponent(
                            `tts-${entry.id}.${
                              entry.mimeType === "audio/mpeg" ? "mp3" : "wav"
                            }`,
                          )}`}
                          aria-label="Download audio"
                          className="inline-flex size-6 items-center justify-center border border-(--line) text-(--muted-foreground) transition-colors hover:text-(--foreground)"
                        >
                          <Download className="size-3" aria-hidden />
                        </a>
                      ) : null}
                      <button
                        type="button"
                        aria-label="Delete audio history"
                        onClick={() => onDelete(entry.id)}
                        className="inline-flex size-6 items-center justify-center border border-(--line) text-(--muted-foreground) transition-colors hover:text-(--foreground)"
                      >
                        <Trash2 className="size-3" aria-hidden />
                      </button>
                    </div>
                  </div>
                  {entry.fileUrl ? (
                    <audio controls src={entry.fileUrl} className="h-8 w-full" />
                  ) : null}
                  {speakers.length > 0 ? (
                    <div className="mt-2 line-clamp-1 font-mono text-[9px] tracking-[0.1em] text-(--muted-foreground) uppercase">
                      {speakers
                        .map((speaker) => `${speaker.speaker}:${speaker.voiceName}`)
                        .join(" / ")}
                    </div>
                  ) : null}
                  <div className="mt-1 font-mono text-[9px] text-(--muted-foreground)">
                    {formatDate(entry.createdAt)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}

export function TtsCard() {
  const utils = trpc.useUtils();
  const configQuery = trpc.tools.getTtsPublicConfig.useQuery();
  const historyQuery = trpc.tools.listMyTtsHistory.useQuery();
  const generateTts = trpc.tools.generateTts.useMutation();
  const deleteEntry = trpc.tools.deleteMyEntry.useMutation();
  const previewVoice = trpc.tools.previewTtsVoice.useMutation();

  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [lastTokens, setLastTokens] = useState<TtsTokens | null>(null);
  // Cache data URL preview per voice agar tak memanggil ulang dalam sesi.
  const previewCache = useRef<Map<string, string>>(new Map());

  const config = configQuery.data;
  const providerStatus = config?.providers;

  const [session, setSession] = useState<TtsSession>(() => defaultSession());
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    if (!config) return;
    setSession(readSession(config.defaultVoice, config.voiceOptions));
    setHasMounted(true);
  }, [config]);

  useEffect(() => {
    if (!hasMounted) return;
    writeSession(session);
  }, [hasMounted, session]);

  const availableProviders = useMemo<TtsProviderId[]>(() => {
    if (!providerStatus) return [];
    return (["gemini", "vertex", "openrouter"] as TtsProviderId[]).filter(
      (p) => providerStatus[p]?.hasApiKey,
    );
  }, [providerStatus]);

  const providerReady = Boolean(providerStatus?.[session.provider]?.hasApiKey);

  // Daftar model live untuk provider terpilih.
  const modelsQuery = trpc.tools.listTtsModels.useQuery(
    { provider: session.provider },
    { enabled: hasMounted && providerReady, staleTime: 5 * 60_000, retry: false },
  );
  const models = modelsQuery.data?.models ?? [];
  const voiceOptions = useMemo(
    () => modelsQuery.data?.voices ?? config?.voiceOptions ?? ["Kore"],
    [modelsQuery.data?.voices, config?.voiceOptions],
  );
  const defaultVoice = voiceOptions[0] ?? "Kore";
  const isSingleVoice = session.provider === "openrouter";

  // Pastikan provider terpilih punya key; jika tidak, pindah ke yang tersedia.
  useEffect(() => {
    if (!hasMounted || availableProviders.length === 0) return;
    if (!availableProviders.includes(session.provider)) {
      setSession((p) => ({ ...p, provider: availableProviders[0], model: "" }));
    }
  }, [hasMounted, availableProviders, session.provider]);

  // Auto-pilih model pertama saat daftar termuat & model belum valid.
  useEffect(() => {
    const list = modelsQuery.data?.models;
    if (!list || list.length === 0) return;
    if (!session.model || !list.some((m) => m.id === session.model)) {
      setSession((p) => ({ ...p, model: list[0]!.id }));
    }
  }, [modelsQuery.data?.models, session.model]);

  // Samakan voiceName speakers dgn voice set provider terpilih. JANGAN memotong
  // jumlah speaker (single-voice openrouter hanya ditampilkan/dikirim 1, tapi
  // state speakers tetap utuh agar tak hilang saat balik ke gemini/vertex).
  useEffect(() => {
    const allowed = modelsQuery.data?.voices;
    if (!allowed || allowed.length === 0) return;
    setSession((p) => {
      const speakers = p.speakers.map((s) =>
        allowed.includes(s.voiceName) ? s : { ...s, voiceName: allowed[0]! },
      );
      const same = speakers.every((s, i) => s.voiceName === p.speakers[i]!.voiceName);
      return same ? p : { ...p, speakers };
    });
  }, [modelsQuery.data?.voices]);

  const entries = useMemo(() => {
    return ((historyQuery.data ?? []) as TtsHistoryEntry[]).filter(
      (entry) => entry.status === "success" && entry.fileUrl,
    );
  }, [historyQuery.data]);

  const latestHistory = entries[0] ?? null;
  const previewUrl = session.resultUrl ?? latestHistory?.fileUrl ?? null;
  const displayTokens =
    lastTokens ?? readOutputMeta(latestHistory?.outputMeta).tokens ?? null;
  const isGenerating = session.status === "generating";
  const canGenerate =
    Boolean(config?.enabled) && providerReady && Boolean(session.model);

  // Polling status job TTS saat sedang generating (tahan refresh via rowId).
  const shouldPoll = isGenerating && session.rowId !== null;
  const statusQuery = trpc.tools.getTtsStatus.useQuery(
    { id: session.rowId ?? 0 },
    {
      enabled: shouldPoll,
      refetchInterval: shouldPoll ? 5000 : false,
      refetchOnWindowFocus: false,
      retry: false,
    },
  );

  useEffect(() => {
    if (!shouldPoll) return;
    const data = statusQuery.data;
    if (!data) return;
    if (data.status === "success" && data.url) {
      setSession((prev) => ({
        ...prev,
        status: "idle",
        startedAt: null,
        resultUrl: data.url ?? null,
        error: null,
      }));
      setLastTokens(data.tokens ?? null);
      void utils.tools.listMyTtsHistory.invalidate();
    } else if (data.status === "error") {
      const message = data.error ?? "Generate TTS gagal";
      setSession((prev) => ({
        ...prev,
        status: "error",
        startedAt: null,
        rowId: null,
        resultUrl: null,
        error: message,
      }));
      toast.error(message);
      void utils.tools.listMyTtsHistory.invalidate();
    }
  }, [shouldPoll, statusQuery.data, utils]);

  function setSpeakerList(speakers: TtsSpeaker[]) {
    setSession((prev) =>
      prev.status === "generating" ? prev : { ...prev, speakers },
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isGenerating) return;

    const text = session.text.trim();
    if (!text) {
      toast.error("Text TTS tidak boleh kosong");
      return;
    }
    if (!canGenerate) {
      toast.error("TTS belum aktif atau API key belum dikonfigurasi");
      return;
    }

    // OpenRouter single-voice: kirim hanya speaker pertama (state tetap utuh).
    const sourceSpeakers = isSingleVoice
      ? session.speakers.slice(0, 1)
      : session.speakers.slice(0, MAX_SPEAKERS);
    const speakers = sourceSpeakers.map((speaker) => ({
      speaker: speaker.speaker.trim() || "Speaker",
      voiceName: speaker.voiceName.trim(),
    }));
    if (speakers.some((speaker) => !speaker.voiceName)) {
      toast.error("Voice wajib diisi");
      return;
    }

    if (!session.model) {
      toast.error("Pilih model dulu");
      return;
    }

    const startedAt = Date.now();
    setLastTokens(null);
    setSession((prev) => ({
      ...prev,
      status: "generating",
      startedAt,
      rowId: null,
      resultUrl: null,
      error: null,
    }));

    try {
      // Job async: mutation hanya membuat row pending & mengembalikan id.
      // Hasil dipantau via polling getTtsStatus (useEffect di bawah).
      const result = await generateTts.mutateAsync({
        provider: session.provider,
        model: session.model,
        text,
        styleInstruction: session.styleInstruction.trim(),
        speakers,
        format: session.format,
      });
      setSession((prev) => ({
        ...prev,
        status: "generating",
        startedAt,
        rowId: result.id,
        resultUrl: null,
        error: null,
      }));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Generate TTS gagal";
      setSession((prev) => ({
        ...prev,
        status: "error",
        startedAt: null,
        rowId: null,
        resultUrl: null,
        error: message,
      }));
      toast.error(message);
    }
  }

  async function onDelete(id: number) {
    try {
      await deleteEntry.mutateAsync({ id });
      await utils.tools.listMyTtsHistory.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus audio");
    }
  }

  function onReset() {
    setSession(defaultSession(defaultVoice, voiceOptions));
  }

  function onLoadEntry(entry: TtsHistoryEntry) {
    if (isGenerating) return;
    const meta = readInputMeta(entry.inputMeta);
    const provider = normalizeProvider(meta.provider);
    const speakers =
      meta.speakers && meta.speakers.length > 0
        ? meta.speakers.slice(0, MAX_SPEAKERS).map((s) => ({
            speaker: s.speaker,
            voiceName: s.voiceName,
          }))
        : defaultSpeakers(defaultVoice, voiceOptions);
    setSession((prev) => ({
      ...prev,
      provider,
      model: meta.model ?? "",
      text: entry.prompt ?? "",
      styleInstruction: meta.styleInstruction ?? "",
      speakers,
    }));
    toast.success("Dimuat ke form");
  }

  async function onPreview(voiceName: string) {
    if (previewingVoice) return;
    if (!session.model) {
      toast.error("Pilih model dulu");
      return;
    }
    const cacheKey = `${session.provider}:${session.model}:${voiceName}`;
    const cached = previewCache.current.get(cacheKey);
    if (cached) {
      void new Audio(cached).play().catch(() => undefined);
      return;
    }
    if (!canGenerate) {
      toast.error("TTS belum aktif atau provider belum dikonfigurasi");
      return;
    }
    setPreviewingVoice(voiceName);
    try {
      const result = await previewVoice.mutateAsync({
        provider: session.provider,
        model: session.model,
        voiceName,
      });
      previewCache.current.set(cacheKey, result.dataUrl);
      void new Audio(result.dataUrl).play().catch(() => undefined);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Preview voice gagal");
    } finally {
      setPreviewingVoice(null);
    }
  }

  const configMessage = !config?.enabled
    ? "TTS belum aktif di AI Settings."
    : availableProviders.length === 0
      ? "Belum ada provider dengan API key. Atur di AI Settings."
      : "Multi-speaker (Gemini/Vertex) atau single-voice (OpenRouter). Pilih provider, model, voice lalu generate.";

  return (
    <article className="flex h-full min-h-0 flex-col border-(--line) bg-(--background)">
      <header className="screen-line-bottom shrink-0 flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden
            className="grid size-7 place-items-center border border-(--line) text-(--foreground)"
          >
            <Volume2 className="size-3.5" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold tracking-tight">
              TTS Text To Speech
              <sup className="ml-1 text-[10px] font-medium tracking-normal text-(--muted-foreground)">
                v1
              </sup>
            </h3>
            <p className="line-clamp-1 font-mono text-[10px] tracking-[0.16em] text-(--muted-foreground) uppercase">
              Audio · Gemini
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.18em] text-(--muted-foreground) uppercase">
          <span
            className={cn(
              "size-1.5 rounded-full",
              isGenerating
                ? "bg-amber-500"
                : session.status === "error" || !canGenerate
                  ? "bg-rose-500"
                  : "bg-emerald-500",
            )}
          />
          {isGenerating
            ? "running"
            : session.status === "error" || !canGenerate
              ? "setup"
              : "ready"}
        </div>
      </header>

      <div className="shrink-0 px-4 py-4">
        <p className="font-mono text-xs leading-6 text-(--muted-foreground)">
          {configMessage}
        </p>
      </div>

      <div className="screen-line-top min-h-0 flex-1 overflow-y-auto">
        <div className="px-4 py-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-stretch">
          <div className="grid min-w-0 gap-4">
            <div className="flex min-h-56 items-start">
              <div className="relative w-full border border-dashed border-(--line) bg-(--muted)/20 p-4">
                {isGenerating ? (
                  <div className="aspect-video">
                    <GeneratingAnimation
                      label="Synthesizing Audio"
                      startedAt={session.startedAt}
                    />
                  </div>
                ) : previewUrl ? (
                  <div className="grid min-h-48 content-center gap-4">
                    <div className="grid place-items-center gap-3 font-mono text-[10px] tracking-[0.2em] text-(--muted-foreground) uppercase">
                      <Mic2 className="size-8" aria-hidden />
                      Audio preview
                      {displayTokens?.total != null ? (
                        <span className="text-(--foreground)">
                          {displayTokens.total.toLocaleString()} tokens
                        </span>
                      ) : null}
                    </div>
                    <audio controls src={previewUrl} className="w-full" />
                  </div>
                ) : (
                  <div className="grid min-h-48 place-items-center font-mono text-[10px] tracking-[0.2em] text-(--muted-foreground) uppercase">
                    Output preview · audio
                  </div>
                )}
              </div>
            </div>

            <TtsSpeakerRail
              speakers={session.speakers}
              voices={voiceOptions}
              disabled={isGenerating}
              singleVoice={isSingleVoice}
              onChange={setSpeakerList}
              onPreview={onPreview}
              previewingVoice={previewingVoice}
            />
          </div>

          <TtsHistoryPanel
            entries={entries}
            onDelete={onDelete}
            onLoad={onLoadEntry}
            isLoading={historyQuery.isPending}
          />
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="screen-line-top flex flex-col gap-3 px-4 py-4"
      >
        <fieldset disabled={isGenerating} className="grid gap-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <div className="font-mono text-[10px] tracking-[0.2em] text-(--muted-foreground) uppercase">
                Provider
              </div>
              <Select
                value={availableProviders.includes(session.provider) ? session.provider : ""}
                disabled={isGenerating || availableProviders.length === 0}
                onValueChange={(value) =>
                  setSession((prev) => ({
                    ...prev,
                    provider: normalizeProvider(value),
                    model: "",
                  }))
                }
              >
                <SelectTrigger className="h-8 rounded-none border-(--line) font-mono text-[11px]">
                  <SelectValue placeholder="Pilih provider" />
                </SelectTrigger>
                <SelectContent className="rounded-none border-(--line)">
                  {availableProviders.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PROVIDER_LABEL[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] text-(--muted-foreground) uppercase">
                Model
                {modelsQuery.isFetching ? (
                  <Loader2 className="size-3 animate-spin" aria-hidden />
                ) : null}
              </div>
              <Select
                value={models.some((m) => m.id === session.model) ? session.model : ""}
                disabled={isGenerating || models.length === 0}
                onValueChange={(value) =>
                  setSession((prev) => ({ ...prev, model: value }))
                }
              >
                <SelectTrigger className="h-8 rounded-none border-(--line) font-mono text-[11px]">
                  <SelectValue
                    placeholder={
                      modelsQuery.isLoading
                        ? "Memuat model…"
                        : models.length === 0
                          ? "Tidak ada model"
                          : "Pilih model"
                    }
                  />
                </SelectTrigger>
                <SelectContent className="rounded-none border-(--line)">
                  {models.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.2em] uppercase text-(--muted-foreground)">
              <span>Script</span>
              <span
                className={cn(
                  "tabular-nums",
                  session.text.length >= 8000
                    ? "text-rose-500"
                    : session.text.length > 7600
                      ? "text-amber-500"
                      : undefined,
                )}
              >
                {session.text.length}/8000
              </span>
            </div>
            <Textarea
              value={session.text}
              onChange={(event) =>
                setSession((prev) => ({ ...prev, text: event.target.value }))
              }
              rows={7}
              maxLength={8000}
              placeholder="Narrator: Open with a calm technical tone..."
              className="min-h-40 rounded-none border-(--line) font-mono text-xs leading-6"
            />
          </div>

          <div className="grid gap-2">
            <div className="font-mono text-[10px] tracking-[0.2em] text-(--muted-foreground) uppercase">
              Direction
            </div>
            <Input
              value={session.styleInstruction}
              onChange={(event) =>
                setSession((prev) => ({
                  ...prev,
                  styleInstruction: event.target.value,
                }))
              }
              placeholder="Example: calm, cinematic, Indonesian accent, measured pacing"
              className="rounded-none border-(--line) font-mono text-xs"
            />
          </div>
        </fieldset>

        {session.error ? (
          <div className="border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-xs text-rose-500">
            {session.error}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="font-mono text-[10px] tracking-[0.16em] text-(--muted-foreground) uppercase">
              {session.model || "—"}
              {displayTokens?.total != null ? (
                <span className="ml-1.5 text-(--foreground)">
                  · {displayTokens.total.toLocaleString()} tok
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] tracking-[0.18em] text-(--muted-foreground) uppercase">
                Format
              </span>
              <Select
                value={session.format}
                disabled={isGenerating}
                onValueChange={(value) =>
                  setSession((prev) => ({
                    ...prev,
                    format: value === "mp3" ? "mp3" : "wav",
                  }))
                }
              >
                <SelectTrigger className="h-7 w-20 rounded-none border-(--line) font-mono text-[10px] uppercase">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-none border-(--line)">
                  <SelectItem value="wav">WAV</SelectItem>
                  <SelectItem value="mp3">MP3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onReset}
              disabled={isGenerating}
              className="rounded-none font-mono text-[10px] tracking-[0.14em] uppercase"
            >
              <RotateCcw className="size-3.5" aria-hidden />
              Reset
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isGenerating || !canGenerate || !session.text.trim()}
              className="rounded-none font-mono text-[10px] tracking-[0.14em] uppercase"
            >
              <Send className="size-3.5" aria-hidden />
              {isGenerating ? "Generating" : "Generate"}
            </Button>
          </div>
        </div>
      </form>
      </div>
    </article>
  );
}
