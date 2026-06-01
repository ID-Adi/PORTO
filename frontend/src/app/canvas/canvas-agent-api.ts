import { createTRPCClient, httpBatchLink } from "@trpc/client";

import { BACKEND_URL } from "@/lib/backend-url";

import type { AppRouter } from "@porto/api";
import type { FrameRef, ProposalStatus } from "./canvas-agent-types";

const canvasAgentTrpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${BACKEND_URL}/api/trpc`,
      fetch: (input, init) =>
        fetch(input, { ...init, credentials: "include" }),
    }),
  ],
});

export const canvasAgentApi = {
  listWorkflows: () => canvasAgentTrpc.canvasAgent.listWorkflows.query(),
  getWorkflowSummary: (id: number) =>
    canvasAgentTrpc.canvasAgent.getWorkflowSummary.query({ id }),
  getWorkflowMessages: (input: {
    id: number;
    cursor?: number;
    limit?: number;
  }) => canvasAgentTrpc.canvasAgent.getWorkflowMessages.query(input),
  getWorkflowRuns: (id: number) =>
    canvasAgentTrpc.canvasAgent.getWorkflowRuns.query({ id }),
  getWorkflowProposals: (id: number) =>
    canvasAgentTrpc.canvasAgent.getWorkflowProposals.query({ id }),
  createWorkflow: (input?: { title?: string }) =>
    canvasAgentTrpc.canvasAgent.createWorkflow.mutate(input),
  updateWorkflow: (input: {
    id: number;
    title?: string;
    status?: "active" | "archived";
    isPinned?: boolean;
  }) => canvasAgentTrpc.canvasAgent.updateWorkflow.mutate(input),
  deleteWorkflow: (id: number) =>
    canvasAgentTrpc.canvasAgent.deleteWorkflow.mutate({ id }),
  retryRun: (id: number) => canvasAgentTrpc.canvasAgent.retryRun.mutate({ id }),
  updateProposalStatus: (input: {
    id: number;
    status: ProposalStatus;
    errorMessage?: string | null;
  }) => canvasAgentTrpc.canvasAgent.updateProposalStatus.mutate(input),
  getConfig: () => canvasAgentTrpc.canvasAgent.getConfig.query(),
  updateConfig: (input: {
    provider: "gemini" | "vertex" | "openrouter" | "local";
    model: string;
  }) => canvasAgentTrpc.canvasAgent.updateConfig.mutate(input),
  listLocalModels: () => canvasAgentTrpc.canvasAgent.listLocalModels.query(),
};

export async function streamCanvasAgentMessage(input: {
  workflowId: number;
  content: string;
  frameRefs: FrameRef[];
  clientMessageId: string;
  signal: AbortSignal;
  onEvent: (event: unknown) => void | Promise<void>;
}) {
  const response = await fetch(
    `${BACKEND_URL}/api/canvas-agent/workflows/${input.workflowId}/messages/stream`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: input.content,
        frameRefs: input.frameRefs,
        clientMessageId: input.clientMessageId,
        metadata: { source: "canvas-agent-panel" },
      }),
      signal: input.signal,
    },
  );

  if (!response.ok || !response.body) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Canvas Agent stream HTTP ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split(/\r?\n\r?\n/);
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const dataLines = part
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart());
      if (dataLines.length === 0) continue;
      // Lindungi dari potongan/noise jaringan yang belum lengkap: parse gagal
      // jangan mematikan reader, cukup lewati chunk ini.
      let event: unknown;
      try {
        event = JSON.parse(dataLines.join("\n"));
      } catch {
        continue;
      }
      await input.onEvent(event);
    }
  }
}
