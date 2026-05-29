"use client";

import {
  Download,
  Mic2,
  Plus,
  RotateCcw,
  Send,
  Trash2,
  Volume2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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

type TtsSession = {
  text: string;
  styleInstruction: string;
  speakers: TtsSpeaker[];
  status: Status;
  startedAt: number | null;
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

type OutputMeta = {
  durationSeconds?: number;
};

const STORAGE_KEY = "porto.tools.session.tts";
const SESSION_TTL_MS = 1000 * 60 * 30;
const MAX_SPEAKERS = 4;

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
  };
}

function defaultSpeakers(defaultVoice: string, voices: readonly string[]) {
  const secondVoice = voices.find((voice) => voice !== defaultVoice) ?? defaultVoice;
  return [
    { speaker: "Narrator", voiceName: defaultVoice },
    { speaker: "Guest", voiceName: secondVoice },
  ];
}

function defaultSession(defaultVoice = "Kore", voices: readonly string[] = ["Kore"]) {
  return {
    text: "",
    styleInstruction: "",
    speakers: defaultSpeakers(defaultVoice, voices),
    status: "idle" as const,
    startedAt: null,
    resultUrl: null,
    error: null,
  };
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

    return {
      text: parsed.text ?? "",
      styleInstruction: parsed.styleInstruction ?? "",
      speakers,
      status: parsed.status === "generating" ? "idle" : parsed.status ?? "idle",
      startedAt: null,
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

function TtsSpeakerRail({
  speakers,
  voices,
  disabled,
  onChange,
}: {
  speakers: TtsSpeaker[];
  voices: readonly string[];
  disabled: boolean;
  onChange: (speakers: TtsSpeaker[]) => void;
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
    <aside className="flex w-full flex-col border border-(--line) bg-(--background) lg:w-56">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-(--line) px-3 py-2.5">
        <span className="font-mono text-[10px] tracking-[0.2em] text-(--muted-foreground) uppercase">
          Speakers
        </span>
        <span className="font-mono text-[10px] tabular-nums text-(--muted-foreground)">
          {speakers.length.toString().padStart(2, "0")}/04
        </span>
      </header>

      <div className="grid gap-2 p-2">
        {speakers.map((speaker, index) => (
          <div key={index} className="border border-(--line) p-2">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] tracking-[0.18em] text-(--muted-foreground) uppercase">
                {index === 0 ? "Primary" : `Voice ${index + 1}`}
              </span>
              <button
                type="button"
                aria-label="Remove speaker"
                disabled={disabled || speakers.length <= 1}
                onClick={() => removeSpeaker(index)}
                className="inline-flex size-5 items-center justify-center text-(--muted-foreground) transition-colors hover:text-(--foreground) disabled:pointer-events-none disabled:opacity-30"
              >
                <X className="size-3" aria-hidden />
              </button>
            </div>
            <Input
              value={speaker.speaker}
              disabled={disabled}
              onChange={(event) =>
                update(index, { speaker: event.target.value })
              }
              className="mb-2 h-8 rounded-none border-(--line) font-mono text-[11px]"
              aria-label={`Speaker ${index + 1} label`}
            />
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
          </div>
        ))}

        <button
          type="button"
          disabled={disabled || speakers.length >= MAX_SPEAKERS}
          onClick={addSpeaker}
          className="inline-flex h-9 items-center justify-center gap-2 border border-dashed border-(--line) font-mono text-[10px] tracking-[0.16em] text-(--muted-foreground) uppercase transition-colors hover:border-(--foreground) hover:text-(--foreground) disabled:pointer-events-none disabled:opacity-40"
        >
          <Plus className="size-3" aria-hidden />
          Add speaker
        </button>
      </div>
    </aside>
  );
}

function TtsHistoryPanel({
  entries,
  onDelete,
  isLoading,
}: {
  entries: TtsHistoryEntry[];
  onDelete: (id: number) => void;
  isLoading: boolean;
}) {
  return (
    <aside className="flex w-full flex-col border border-(--line) bg-(--background) lg:max-h-[60vh] lg:w-60">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-(--line) px-3 py-2.5">
        <span className="font-mono text-[10px] tracking-[0.2em] text-(--muted-foreground) uppercase">
          History
        </span>
        <span className="font-mono text-[10px] tabular-nums text-(--muted-foreground)">
          {entries.length.toString().padStart(2, "0")}
        </span>
      </header>

      <div className="min-h-36 overflow-y-auto p-2">
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
              return (
                <div key={entry.id} className="border border-(--line) p-2">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-xs font-medium">
                        {entry.prompt || "Untitled audio"}
                      </div>
                      <div className="mt-1 font-mono text-[9px] tracking-[0.12em] text-(--muted-foreground) uppercase">
                        {inputMeta.model ?? "tts"} /{" "}
                        {outputMeta.durationSeconds
                          ? `${outputMeta.durationSeconds}s`
                          : entry.status}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {entry.fileUrl ? (
                        <a
                          href={`/api/download?url=${encodeURIComponent(
                            entry.fileUrl,
                          )}&filename=${encodeURIComponent(`tts-${entry.id}.wav`)}`}
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

  const voiceOptions = useMemo(
    () => configQuery.data?.voiceOptions ?? ["Kore"],
    [configQuery.data?.voiceOptions],
  );
  const defaultVoice = configQuery.data?.defaultVoice ?? voiceOptions[0] ?? "Kore";
  const [session, setSession] = useState<TtsSession>(() =>
    defaultSession(defaultVoice, voiceOptions),
  );
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    if (!configQuery.data) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession(readSession(configQuery.data.defaultVoice, configQuery.data.voiceOptions));
    setHasMounted(true);
  }, [configQuery.data]);

  useEffect(() => {
    if (!hasMounted) return;
    writeSession(session);
  }, [hasMounted, session]);

  const entries = useMemo(() => {
    return ((historyQuery.data ?? []) as TtsHistoryEntry[]).filter(
      (entry) => entry.status === "success" && entry.fileUrl,
    );
  }, [historyQuery.data]);

  const latestHistory = entries[0] ?? null;
  const previewUrl = session.resultUrl ?? latestHistory?.fileUrl ?? null;
  const isGenerating = session.status === "generating";
  const canGenerate =
    Boolean(configQuery.data?.enabled) && Boolean(configQuery.data?.hasApiKey);

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

    const speakers = session.speakers.map((speaker) => ({
      speaker: speaker.speaker.trim(),
      voiceName: speaker.voiceName.trim(),
    }));
    if (speakers.some((speaker) => !speaker.speaker || !speaker.voiceName)) {
      toast.error("Speaker dan voice wajib diisi");
      return;
    }

    const startedAt = Date.now();
    setSession((prev) => ({
      ...prev,
      status: "generating",
      startedAt,
      resultUrl: null,
      error: null,
    }));

    try {
      const result = await generateTts.mutateAsync({
        text,
        styleInstruction: session.styleInstruction.trim(),
        speakers,
      });
      setSession((prev) => ({
        ...prev,
        status: "idle",
        startedAt: null,
        resultUrl: result.url,
        error: null,
      }));
      await utils.tools.listMyTtsHistory.invalidate();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Generate TTS gagal";
      setSession((prev) => ({
        ...prev,
        status: "error",
        startedAt: null,
        resultUrl: null,
        error: message,
      }));
      toast.error(message);
      await utils.tools.listMyTtsHistory.invalidate();
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

  const configMessage = !configQuery.data?.enabled
    ? "TTS belum aktif di AI Settings."
    : !configQuery.data?.hasApiKey
      ? "Gemini API key belum dikonfigurasi."
      : "Multi-speaker TTS via Gemini. Atur speaker, voice, dan direction lalu generate audio WAV.";

  return (
    <article className="flex flex-col border-(--line) bg-(--background)">
      <header className="screen-line-bottom flex items-center justify-between gap-3 px-4 py-3">
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

      <div className="px-4 py-4">
        <p className="font-mono text-xs leading-6 text-(--muted-foreground)">
          {configMessage}
        </p>
      </div>

      <div className="screen-line-top px-4 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <TtsSpeakerRail
            speakers={session.speakers}
            voices={voiceOptions}
            disabled={isGenerating}
            onChange={setSpeakerList}
          />

          <div className="flex min-h-56 items-start justify-center lg:flex-1">
            <div className="relative w-full max-w-xl border border-dashed border-(--line) bg-(--muted)/20 p-4">
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

          <TtsHistoryPanel
            entries={entries}
            onDelete={onDelete}
            isLoading={historyQuery.isPending}
          />
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="screen-line-top flex flex-col gap-3 px-4 py-4"
      >
        <fieldset disabled={isGenerating} className="grid gap-3">
          <div className="grid gap-2">
            <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.2em] uppercase text-(--muted-foreground)">
              <span>Script</span>
              <span className="tabular-nums">{session.text.length}/8000</span>
            </div>
            <Textarea
              value={session.text}
              onChange={(event) =>
                setSession((prev) => ({ ...prev, text: event.target.value }))
              }
              rows={7}
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
          <div className="font-mono text-[10px] tracking-[0.16em] text-(--muted-foreground) uppercase">
            {configQuery.data?.model ?? "gemini tts"}
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
              disabled={isGenerating || !canGenerate}
              className="rounded-none font-mono text-[10px] tracking-[0.14em] uppercase"
            >
              <Send className="size-3.5" aria-hidden />
              {isGenerating ? "Generating" : "Generate"}
            </Button>
          </div>
        </div>
      </form>
    </article>
  );
}
