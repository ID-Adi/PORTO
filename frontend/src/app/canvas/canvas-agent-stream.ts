"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  appendMessage,
  removeMessage,
  updateMessage,
  upsertProposal,
  upsertRun,
  upsertServerMessage,
} from "./canvas-agent-cache";
import { streamCanvasAgentMessage } from "./canvas-agent-api";
import { canvasAgentKeys } from "./canvas-agent-query-keys";

import type {
  CanvasAgentMessage,
  CanvasAgentStreamEvent,
  FrameRef,
} from "./canvas-agent-types";

function streamMessageId(runId: number) {
  return `stream:${runId}`;
}

function optimisticMessageId(clientMessageId: string) {
  return `client:${clientMessageId}`;
}

function isStreamMessage(message: CanvasAgentMessage) {
  return typeof message.id === "string" && message.id.startsWith("stream:");
}

function isCanvasAgentStreamEvent(value: unknown): value is CanvasAgentStreamEvent {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    typeof (value as { type?: unknown }).type === "string"
  );
}

export function useCanvasAgentStream() {
  const queryClient = useQueryClient();
  const abortRef = useRef<AbortController | null>(null);
  const failedResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [streamState, setStreamState] = useState<
    "idle" | "thinking" | "streaming" | "saving" | "failed"
  >("idle");

  const clearFailedReset = useCallback(() => {
    if (!failedResetRef.current) return;
    clearTimeout(failedResetRef.current);
    failedResetRef.current = null;
  }, []);

  const markFailed = useCallback(() => {
    clearFailedReset();
    setStreamState("failed");
    failedResetRef.current = setTimeout(() => {
      setStreamState((current) => (current === "failed" ? "idle" : current));
      failedResetRef.current = null;
    }, 5_000);
  }, [clearFailedReset]);

  useEffect(() => clearFailedReset, [clearFailedReset]);

  const stop = useCallback(() => {
    clearFailedReset();
    abortRef.current?.abort();
    abortRef.current = null;
    setStreamState("idle");
  }, [clearFailedReset]);

  const start = useCallback(
    async (input: {
      workflowId: number;
      content: string;
      frameRefs: FrameRef[];
      clientMessageId: string;
    }) => {
      const controller = new AbortController();
      clearFailedReset();
      abortRef.current?.abort();
      abortRef.current = controller;
      setStreamState("thinking");
      let failed = false;
      let activeRunId: number | null = null;
      let sawUserMessage = false;
      let sawTerminalEvent = false;

      const optimistic: CanvasAgentMessage = {
        id: optimisticMessageId(input.clientMessageId),
        workflowId: input.workflowId,
        role: "user",
        content: input.content,
        frameRefs: input.frameRefs,
        metadata: {
          source: "canvas-agent-panel",
          optimistic: true,
          clientMessageId: input.clientMessageId,
        },
        createdAt: new Date().toISOString(),
      };
      appendMessage(queryClient, input.workflowId, optimistic);

      try {
        await streamCanvasAgentMessage({
          ...input,
          signal: controller.signal,
          onEvent: async (rawEvent) => {
            if (!isCanvasAgentStreamEvent(rawEvent)) return;

            if (rawEvent.type === "user_message") {
              sawUserMessage = true;
              upsertServerMessage(
                queryClient,
                input.workflowId,
                rawEvent.message,
                rawEvent.clientMessageId ?? input.clientMessageId,
              );
              await queryClient.invalidateQueries({
                queryKey: canvasAgentKeys.workflows(),
              });
              return;
            }

            if (rawEvent.type === "agent_disabled") {
              sawTerminalEvent = true;
              setStreamState("idle");
              removeMessage(
                queryClient,
                input.workflowId,
                (message) =>
                  message.id === optimisticMessageId(input.clientMessageId),
              );
              await queryClient.invalidateQueries({
                queryKey: canvasAgentKeys.workflows(),
              });
              toast.info(rawEvent.message);
              return;
            }

            if (rawEvent.type === "run_started") {
              activeRunId = rawEvent.run.id;
              setStreamState("streaming");
              upsertRun(queryClient, input.workflowId, rawEvent.run);
              appendMessage(queryClient, input.workflowId, {
                id: streamMessageId(rawEvent.run.id),
                workflowId: input.workflowId,
                role: "assistant",
                content: "",
                frameRefs: input.frameRefs,
                metadata: {
                  source: "canvas-agent-stream",
                  streaming: true,
                  runId: rawEvent.run.id,
                },
                createdAt: new Date().toISOString(),
              });
              return;
            }

            if (rawEvent.type === "assistant_delta") {
              activeRunId = rawEvent.runId;
              setStreamState("streaming");
              updateMessage(
                queryClient,
                input.workflowId,
                (message) => message.id === streamMessageId(rawEvent.runId),
                (message) => ({
                  ...message,
                  content: `${message.content}${rawEvent.delta}`,
                }),
              );
              return;
            }

            if (rawEvent.type === "assistant_message") {
              activeRunId = rawEvent.runId;
              setStreamState("saving");
              upsertServerMessage(
                queryClient,
                input.workflowId,
                rawEvent.message,
              );
              removeMessage(
                queryClient,
                input.workflowId,
                (message) => message.id === streamMessageId(rawEvent.runId),
              );
              return;
            }

            if (rawEvent.type === "proposal_created") {
              activeRunId = rawEvent.runId;
              upsertProposal(queryClient, input.workflowId, rawEvent.proposal);
              return;
            }

            if (rawEvent.type === "run_completed") {
              sawTerminalEvent = true;
              activeRunId = rawEvent.run.id;
              upsertRun(queryClient, input.workflowId, rawEvent.run);
              await queryClient.invalidateQueries({
                queryKey: canvasAgentKeys.workflows(),
              });
              setStreamState("idle");
              return;
            }

            if (rawEvent.type === "run_failed") {
              sawTerminalEvent = true;
              failed = true;
              markFailed();
              upsertRun(queryClient, input.workflowId, rawEvent.run);
              removeMessage(
                queryClient,
                input.workflowId,
                (message) =>
                  message.id === optimisticMessageId(input.clientMessageId),
              );
              removeMessage(
                queryClient,
                input.workflowId,
                (message) =>
                  message.id ===
                  streamMessageId(rawEvent.run?.id ?? activeRunId ?? 0),
              );
              toast.error(rawEvent.errorMessage);
            }
          },
        });
      } catch (error) {
        const aborted = controller.signal.aborted;
        failed = !aborted;
        if (aborted) {
          setStreamState("idle");
        } else {
          markFailed();
        }
        // Bersihkan pesan optimis user yang mungkin nyangkut. Draft asisten
        // (stream:*) ikut hilang saat messages di-invalidate & refetch dari DB.
        // Tanpa ini, menekan "Stop" meninggalkan ghost message yang loading abadi.
        removeMessage(
          queryClient,
          input.workflowId,
          (message) => message.id === optimisticMessageId(input.clientMessageId),
        );
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: canvasAgentKeys.messages(input.workflowId),
          }),
          queryClient.invalidateQueries({
            queryKey: canvasAgentKeys.runs(input.workflowId),
          }),
          queryClient.invalidateQueries({
            queryKey: canvasAgentKeys.proposals(input.workflowId),
          }),
        ]);
        // Abort = aksi sengaja user, jangan dilempar sebagai error.
        if (!aborted) throw error;
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        removeMessage(queryClient, input.workflowId, isStreamMessage);
        if (!sawUserMessage) {
          removeMessage(
            queryClient,
            input.workflowId,
            (message) =>
              message.id === optimisticMessageId(input.clientMessageId),
          );
        }
        if (!controller.signal.aborted && (!sawUserMessage || !sawTerminalEvent)) {
          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: canvasAgentKeys.messages(input.workflowId),
            }),
            queryClient.invalidateQueries({
              queryKey: canvasAgentKeys.runs(input.workflowId),
            }),
            queryClient.invalidateQueries({
              queryKey: canvasAgentKeys.proposals(input.workflowId),
            }),
          ]);
        }
        if (!controller.signal.aborted && !failed) {
          setStreamState("idle");
        }
      }
    },
    [clearFailedReset, markFailed, queryClient],
  );

  return {
    start,
    stop,
    streamState,
    isStreaming:
      streamState === "thinking" ||
      streamState === "streaming" ||
      streamState === "saving",
  };
}
