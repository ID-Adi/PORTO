import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db/index.js";
import {
  aiToolSettings,
  canvasAgentMessages,
  canvasAgentProposals,
  canvasAgentRuns,
  canvasAgentWorkflows,
  type CanvasAgentChange,
  type CanvasAgentFrameRef,
  type CanvasAgentSceneData,
} from "../db/schema/index.js";
import { decryptSecret } from "./encrypted-secret.js";
import {
  OPENROUTER_BASE_URL,
  TtsError,
  vertexAccessToken,
  vertexBaseUrl,
} from "./tts-providers.js";

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const AGENT_TIMEOUT_MS = 90_000;
const MAX_HISTORY_MESSAGES = 24;
const MAX_SCENE_ELEMENTS = 120;

type CanvasAgentProvider = "gemini" | "vertex" | "openrouter";

type CanvasAgentMessage = typeof canvasAgentMessages.$inferSelect;
type CanvasAgentWorkflow = typeof canvasAgentWorkflows.$inferSelect;
type CanvasAgentSettings = typeof aiToolSettings.$inferSelect;
type CanvasAgentRun = typeof canvasAgentRuns.$inferSelect;
type CanvasAgentProposal = typeof canvasAgentProposals.$inferSelect;

type CanvasAgentRunCallbacks = {
  signal?: AbortSignal;
  onRunStarted?: (run: CanvasAgentRun) => void | Promise<void>;
  onAssistantDelta?: (delta: string) => void | Promise<void>;
  onAssistantMessage?: (message: CanvasAgentMessage) => void | Promise<void>;
  onProposalCreated?: (proposal: CanvasAgentProposal) => void | Promise<void>;
  onRunCompleted?: (run: CanvasAgentRun) => void | Promise<void>;
  onRunFailed?: (
    run: CanvasAgentRun | null,
    errorMessage: string,
  ) => void | Promise<void>;
};

const proposalChangeSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("add"), element: z.unknown() }),
  z.object({
    type: z.literal("update"),
    elementId: z.string().min(1).max(120),
    patch: z.record(z.string(), z.unknown()),
  }),
  z.object({ type: z.literal("delete"), elementId: z.string().min(1).max(120) }),
]);

const agentOutputSchema = z.object({
  content: z.string().min(1).max(12_000),
  proposal: z
    .object({
      summary: z.string().min(1).max(2_000),
      frameIds: z.array(z.string().min(1).max(120)).max(50).default([]),
      changes: z.array(proposalChangeSchema).max(200).default([]),
    })
    .optional()
    .nullable(),
});

type AgentOutput = z.infer<typeof agentOutputSchema>;

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message?: string };
};

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?:
        | string
        | Array<{
            type?: string;
            text?: string;
          }>;
    };
  }>;
  error?: { message?: string };
};

function isProvider(value: string): value is CanvasAgentProvider {
  return value === "gemini" || value === "vertex" || value === "openrouter";
}

function normalizeModel(provider: CanvasAgentProvider, model: string) {
  if (provider === "openrouter") return model.trim();
  return model.trim().replace(/^(publishers\/google\/models\/|models\/)/, "");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function sceneSummary(sceneData: CanvasAgentSceneData | null | undefined) {
  const scene = asRecord(sceneData);
  const elements = Array.isArray(scene?.elements) ? scene.elements : [];
  return elements.slice(0, MAX_SCENE_ELEMENTS).map((raw) => {
    const element = asRecord(raw);
    const customData = asRecord(element?.customData);
    return {
      id: typeof element?.id === "string" ? element.id : null,
      type: typeof element?.type === "string" ? element.type : null,
      frameId: typeof element?.frameId === "string" ? element.frameId : null,
      text: typeof element?.text === "string" ? element.text : undefined,
      x: typeof element?.x === "number" ? element.x : undefined,
      y: typeof element?.y === "number" ? element.y : undefined,
      width: typeof element?.width === "number" ? element.width : undefined,
      height: typeof element?.height === "number" ? element.height : undefined,
      customData: customData
        ? {
            kind:
              typeof customData.kind === "string" ? customData.kind : undefined,
            role:
              typeof customData.role === "string" ? customData.role : undefined,
            description:
              typeof customData.description === "string"
                ? customData.description
                : undefined,
          }
        : undefined,
    };
  });
}

function frameSummary(frameRefs: CanvasAgentFrameRef[]) {
  return frameRefs.map((frame) => ({
    id: frame.id,
    name: frame.name,
    mention: frame.mention,
    elementIds: frame.elementIds.slice(0, 80),
    bounds: frame.bounds,
  }));
}

function messageHistory(messages: CanvasAgentMessage[]) {
  return messages.slice(-MAX_HISTORY_MESSAGES).map((message) => ({
    role: message.role,
    content: message.content,
    frameRefs: frameSummary((message.frameRefs ?? []) as CanvasAgentFrameRef[]),
    createdAt: message.createdAt,
  }));
}

function buildSystemPrompt(settings: CanvasAgentSettings) {
  const custom = settings.canvasAgentSystemPrompt?.trim();
  return [
    custom || "You are Canvas Agent for PORTO /canvas.",
    "Answer in the same language as the user unless they ask otherwise.",
    "You can help with normal conversation even when no frame is mentioned.",
    "When the user mentions frame refs, use the provided frame context.",
    "Never claim the canvas was changed directly.",
    "Only include a proposal when the user EXPLICITLY asks you to create or modify canvas elements AND you can provide concrete Excalidraw element mutations in changes.",
    "For greetings, questions, or normal conversation, omit the proposal field entirely. Never return a proposal with an empty changes array.",
    "Return only valid JSON with shape: {\"content\":\"assistant reply\",\"proposal\":{\"summary\":\"...\",\"frameIds\":[],\"changes\":[...]}}. Omit the proposal field whenever there is no concrete canvas change.",
  ].join("\n");
}

function buildPrompt(args: {
  workflow: CanvasAgentWorkflow;
  userMessage: CanvasAgentMessage;
  messages: CanvasAgentMessage[];
}) {
  const frameRefs = (args.userMessage.frameRefs ?? []) as CanvasAgentFrameRef[];
  return JSON.stringify(
    {
      workflow: {
        id: args.workflow.id,
        title: args.workflow.title,
        activeFrameIds: args.workflow.activeFrameIds,
      },
      currentUserMessage: {
        content: args.userMessage.content,
        frameRefs: frameSummary(frameRefs),
      },
      history: messageHistory(args.messages),
      scene: {
        elements: sceneSummary(args.workflow.sceneData),
      },
    },
    null,
    2,
  );
}

function parseAgentOutput(raw: string): AgentOutput {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  let json: unknown;
  try {
    json = JSON.parse(cleaned);
  } catch {
    return {
      content: cleaned.slice(0, 12_000),
    };
  }
  const parsed = agentOutputSchema.safeParse(json);
  if (!parsed.success) {
    return {
      content: [
        "Agent membalas, tetapi format proposal tidak valid.",
        "",
        cleaned.slice(0, 11_500),
      ].join("\n"),
    };
  }
  return {
    content: parsed.data.content.trim(),
    proposal: parsed.data.proposal ?? undefined,
  };
}

function geminiText(json: GeminiResponse, label: string) {
  const text = json.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();
  if (!text) {
    throw new Error(json.error?.message ?? `${label} tidak mengembalikan teks`);
  }
  return text;
}

function openRouterText(json: OpenRouterResponse) {
  const content = json.choices?.[0]?.message?.content;
  if (typeof content === "string" && content.trim()) return content.trim();
  if (Array.isArray(content)) {
    const text = content
      .map((part) => part.text ?? "")
      .join("")
      .trim();
    if (text) return text;
  }
  throw new Error(json.error?.message ?? "OpenRouter tidak mengembalikan teks");
}

async function callGemini(args: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  prompt: string;
}) {
  const model = normalizeModel("gemini", args.model);
  const res = await fetch(`${GEMINI_BASE_URL}/models/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": args.apiKey,
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: args.systemPrompt }],
      },
      contents: [{ role: "user", parts: [{ text: args.prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    }),
    signal: AbortSignal.timeout(AGENT_TIMEOUT_MS),
  });
  const json = (await res.json()) as GeminiResponse;
  if (!res.ok) {
    throw new Error(json.error?.message ?? `Gemini HTTP ${res.status}`);
  }
  return geminiText(json, "Gemini");
}

async function callVertex(args: {
  saJson: string;
  projectId: string;
  location: string;
  scopes?: string;
  model: string;
  systemPrompt: string;
  prompt: string;
}) {
  let headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const saTrimmed = args.saJson.trim();
  let isJson = false;
  try {
    JSON.parse(saTrimmed);
    isJson = true;
  } catch {}

  if (isJson) {
    const token = await vertexAccessToken(saTrimmed, args.scopes);
    headers["Authorization"] = `Bearer ${token}`;
  } else {
    if (saTrimmed.startsWith("ya29.")) {
      headers["Authorization"] = `Bearer ${saTrimmed}`;
    } else {
      headers["x-goog-api-key"] = saTrimmed;
    }
  }

  const model = normalizeModel("vertex", args.model);
  const body = JSON.stringify({
    system_instruction: {
      parts: [{ text: args.systemPrompt }],
    },
    contents: [{ role: "user", parts: [{ text: args.prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
    },
  });
  const request = (location: string) =>
    fetch(`${vertexBaseUrl(location, args.projectId)}/${model}:generateContent`, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(AGENT_TIMEOUT_MS),
    });

  let res = await request(args.location);
  const json = (await res.json()) as GeminiResponse;
  if (!res.ok) {
    const message = json.error?.message ?? `Vertex HTTP ${res.status}`;
    if (shouldRetryVertexGlobal(args.location, res.status, message)) {
      res = await request("global");
      const fallbackJson = (await res.json()) as GeminiResponse;
      if (!res.ok) {
        throw new Error(
          fallbackJson.error?.message ?? `Vertex HTTP ${res.status}`,
        );
      }
      return geminiText(fallbackJson, "Vertex");
    }
    throw new Error(message);
  }
  return geminiText(json, "Vertex");
}

function shouldRetryVertexGlobal(
  location: string,
  status: number,
  message: string,
): boolean {
  if (location.trim().toLowerCase() === "global") return false;
  if (status !== 400 && status !== 404) return false;
  return /not found|not available|not supported|location|region|publisher model/i.test(
    message,
  );
}

async function callOpenRouter(args: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  prompt: string;
}) {
  const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
      "X-OpenRouter-Title": "PORTO Canvas Agent",
    },
    body: JSON.stringify({
      model: args.model,
      messages: [
        { role: "system", content: args.systemPrompt },
        { role: "user", content: args.prompt },
      ],
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(AGENT_TIMEOUT_MS),
  });
  const json = (await res.json()) as OpenRouterResponse;
  if (!res.ok) {
    throw new Error(json.error?.message ?? `OpenRouter HTTP ${res.status}`);
  }
  return openRouterText(json);
}

async function settingsOrThrow() {
  const [settings] = await db
    .select()
    .from(aiToolSettings)
    .where(eq(aiToolSettings.id, 1))
    .limit(1);
  if (!settings || !settings.canvasAgentEnabled) {
    throw new Error("Canvas Agent belum enabled di AI Settings");
  }
  if (!isProvider(settings.canvasAgentProvider)) {
    throw new Error("Canvas Agent provider tidak valid");
  }
  return settings;
}

async function callProvider(args: {
  settings: CanvasAgentSettings;
  systemPrompt: string;
  prompt: string;
}) {
  const provider = args.settings.canvasAgentProvider as CanvasAgentProvider;
  const model = args.settings.canvasAgentModel;

  if (provider === "gemini") {
    if (!args.settings.ttsApiKeyEncrypted) {
      throw new Error("Gemini API key belum dikonfigurasi");
    }
    return callGemini({
      apiKey: decryptSecret(args.settings.ttsApiKeyEncrypted),
      model,
      systemPrompt: args.systemPrompt,
      prompt: args.prompt,
    });
  }

  if (provider === "openrouter") {
    if (!args.settings.openrouterApiKeyEncrypted) {
      throw new Error("OpenRouter API key belum dikonfigurasi");
    }
    return callOpenRouter({
      apiKey: decryptSecret(args.settings.openrouterApiKeyEncrypted),
      model,
      systemPrompt: args.systemPrompt,
      prompt: args.prompt,
    });
  }

  if (
    !args.settings.vertexServiceAccountEncrypted ||
    !args.settings.vertexProjectId
  ) {
    throw new Error("Kredensial Vertex belum dikonfigurasi");
  }
  return callVertex({
    saJson: decryptSecret(args.settings.vertexServiceAccountEncrypted),
    projectId: args.settings.vertexProjectId,
    location: args.settings.vertexLocation,
    scopes: args.settings.vertexScopes,
    model,
    systemPrompt: args.systemPrompt,
    prompt: args.prompt,
  });
}

function errorMessage(error: unknown) {
  return error instanceof TtsError || error instanceof Error
    ? error.message
    : "Canvas Agent gagal memproses pesan";
}

// Petakan error teknis (timeout/network/HTTP) ke pesan yang bisa dibaca user.
// Pesan mentah tetap di-log untuk debugging server.
export function friendlyAgentError(error: unknown): string {
  const raw =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? `${error.name}: ${error.message}`
        : "";
  const text = raw.toLowerCase();

  if (
    text.includes("aborterror") ||
    text.includes("timeouterror") ||
    text.includes("aborted") ||
    text.includes("timeout") ||
    text.includes("timed out")
  ) {
    return "Agent timeout — model terlalu lama merespons. Coba lagi.";
  }
  if (
    text.includes("fetch failed") ||
    text.includes("enotfound") ||
    text.includes("econnrefused") ||
    text.includes("econnreset") ||
    text.includes("eai_again") ||
    text.includes("terminated") ||
    text.includes("network")
  ) {
    return "Tidak bisa terhubung ke server model. Cek koneksi atau konfigurasi provider.";
  }
  if (text.includes("429") || text.includes("rate limit") || text.includes("quota")) {
    return "Model sedang sibuk atau kena limit (429). Coba beberapa saat lagi.";
  }
  if (text.includes("401") || text.includes("403") || text.includes("unauthorized") || text.includes("permission")) {
    return "Akses model ditolak — periksa API key atau izin provider.";
  }
  if (/\b5\d\d\b/.test(text) || text.includes("internal error") || text.includes("unavailable")) {
    return "Server model sedang bermasalah (5xx). Coba lagi sebentar lagi.";
  }

  // Pesan asli bila pendek & informatif (mis. "Canvas Agent belum enabled...").
  const message = errorMessage(error);
  if (message && message.length <= 160) return message;
  return "Agent gagal memproses pesan.";
}

async function failRun(runId: number, error: unknown) {
  const rawMessage = typeof error === "string" ? error : errorMessage(error);
  const message = typeof error === "string" ? error : friendlyAgentError(error);
  const [run] = await db
    .update(canvasAgentRuns)
    .set({
      status: "failed",
      errorMessage: message,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(canvasAgentRuns.id, runId))
    .returning();
  console.log(`[canvas-agent] run ${runId} failed: ${rawMessage}`);
  return run ?? null;
}

function deltaChunks(content: string) {
  const chunks: string[] = [];
  for (let index = 0; index < content.length; index += 96) {
    chunks.push(content.slice(index, index + 96));
  }
  return chunks;
}

async function emitChunkedDeltaFallback(
  content: string,
  callbacks: CanvasAgentRunCallbacks,
) {
  for (const chunk of deltaChunks(content)) {
    if (callbacks.signal?.aborted) return;
    await callbacks.onAssistantDelta?.(chunk);
  }
}

export async function createCanvasAgentUserMessageRun(args: {
  workflow: Pick<CanvasAgentWorkflow, "id" | "title">;
  content: string;
  frameRefs: CanvasAgentFrameRef[];
  metadata?: Record<string, unknown>;
  enqueue?: boolean;
}) {
  const content = args.content.trim();
  const [message] = await db
    .insert(canvasAgentMessages)
    .values({
      workflowId: args.workflow.id,
      role: "user",
      content,
      frameRefs: args.frameRefs,
      metadata: args.metadata ?? {},
    })
    .returning();

  const titlePatch =
    args.workflow.title === "Untitled workflow"
      ? { title: content.slice(0, 120) || args.workflow.title }
      : {};

  await db
    .update(canvasAgentWorkflows)
    .set({ ...titlePatch, updatedAt: new Date() })
    .where(eq(canvasAgentWorkflows.id, args.workflow.id));

  const [settings] = await db
    .select({
      enabled: aiToolSettings.canvasAgentEnabled,
      provider: aiToolSettings.canvasAgentProvider,
      model: aiToolSettings.canvasAgentModel,
    })
    .from(aiToolSettings)
    .where(eq(aiToolSettings.id, 1))
    .limit(1);

  let run: CanvasAgentRun | null = null;
  if (settings?.enabled) {
    const [createdRun] = await db
      .insert(canvasAgentRuns)
      .values({
        workflowId: args.workflow.id,
        userMessageId: message.id,
        status: "pending",
        provider: settings.provider,
        model: settings.model,
        inputSnapshot: {
          frameRefs: args.frameRefs,
          source: args.metadata?.source ?? "canvas-agent-panel",
          clientMessageId: args.metadata?.clientMessageId,
        },
      })
      .returning();
    run = createdRun;
    console.log(`[canvas-agent] run ${createdRun.id} queued`);
    if (args.enqueue !== false) {
      enqueueCanvasAgentRun(createdRun.id);
    }
  }

  return { message, run };
}

export async function runCanvasAgentRun(
  runId: number,
  callbacks: CanvasAgentRunCallbacks = {},
): Promise<void> {
  try {
    const [run] = await db
      .update(canvasAgentRuns)
      .set({
        status: "running",
        errorMessage: null,
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(canvasAgentRuns.id, runId),
          eq(canvasAgentRuns.status, "pending"),
        ),
      )
      .returning();
    if (!run) return;
    console.log(`[canvas-agent] run ${run.id} running`);
    await callbacks.onRunStarted?.(run);

    const [workflow] = await db
      .select()
      .from(canvasAgentWorkflows)
      .where(eq(canvasAgentWorkflows.id, run.workflowId))
      .limit(1);
    const [userMessage] = await db
      .select()
      .from(canvasAgentMessages)
      .where(
        and(
          eq(canvasAgentMessages.id, run.userMessageId),
          eq(canvasAgentMessages.workflowId, run.workflowId),
        ),
      )
      .limit(1);

    if (!workflow || !userMessage) {
      throw new Error("Workflow atau user message tidak ditemukan");
    }

    const [settings, messages] = await Promise.all([
      settingsOrThrow(),
      db
        .select()
        .from(canvasAgentMessages)
        .where(eq(canvasAgentMessages.workflowId, workflow.id))
        .orderBy(canvasAgentMessages.createdAt),
    ]);

    const prompt = buildPrompt({ workflow, userMessage, messages });
    const raw = await callProvider({
      settings,
      systemPrompt: buildSystemPrompt(settings),
      prompt,
    });
    const output = parseAgentOutput(raw);
    const frameRefs = (userMessage.frameRefs ?? []) as CanvasAgentFrameRef[];
    await emitChunkedDeltaFallback(output.content, callbacks);

    const [assistantMessage] = await db
      .insert(canvasAgentMessages)
      .values({
        workflowId: workflow.id,
        role: "assistant",
        content: output.content,
        frameRefs,
        metadata: {
          source: "canvas-agent-runner",
          provider: settings.canvasAgentProvider,
          model: settings.canvasAgentModel,
          runId: run.id,
        },
      })
      .returning();
    await callbacks.onAssistantMessage?.(assistantMessage);

    let proposal: CanvasAgentProposal | null = null;
    // Hanya buat proposal bila ada perubahan canvas konkret. Mencegah chat biasa
    // (mis. "hello") memunculkan proposal kosong.
    if (
      output.proposal &&
      Array.isArray(output.proposal.changes) &&
      output.proposal.changes.length > 0
    ) {
      const [createdProposal] = await db
        .insert(canvasAgentProposals)
        .values({
          workflowId: workflow.id,
          createdFromMessageId: assistantMessage.id,
          summary: output.proposal.summary,
          frameIds: output.proposal.frameIds,
          changes: output.proposal.changes as CanvasAgentChange[],
        })
        .returning();
      proposal = createdProposal ?? null;
      if (proposal) await callbacks.onProposalCreated?.(proposal);
    }

    const [[completedRun]] = await Promise.all([
      db
        .update(canvasAgentRuns)
        .set({
          status: "succeeded",
          errorMessage: null,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(canvasAgentRuns.id, run.id))
        .returning(),
      db
        .update(canvasAgentWorkflows)
        .set({ updatedAt: new Date() })
        .where(eq(canvasAgentWorkflows.id, workflow.id)),
    ]);
    console.log(`[canvas-agent] run ${run.id} succeeded`);
    await callbacks.onRunCompleted?.(completedRun ?? run);
  } catch (error) {
    const run = await failRun(runId, error);
    await callbacks.onRunFailed?.(run, friendlyAgentError(error));
  }
}

export function enqueueCanvasAgentRun(runId: number) {
  void runCanvasAgentRun(runId).catch((error) => {
    void failRun(runId, error);
  });
}
