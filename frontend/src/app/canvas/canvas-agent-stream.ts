"use client";

import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  appendMessage,
  removeMessage,
  replaceMessage,
  updateMessage,
  upsertProposal,
  upsertRun,
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
  const [streamState, setStreamState] = useState<
    "idle" | "thinking" | "streaming" | "saving" | "failed"
  >("idle");

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreamState("idle");
  }, []);

  const start = useCallback(
    async (input: {
      workflowId: number;
      content: string;
      frameRefs: FrameRef[];
      clientMessageId: string;
    }) => {
      const controller = new AbortController();
      abortRef.current?.abort();
      abortRef.current = controller;
      setStreamState("thinking");
      let failed = false;

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
              replaceMessage(
                queryClient,
                input.workflowId,
                (message) =>
                  message.id === optimisticMessageId(input.clientMessageId),
                rawEvent.message,
              );
              await queryClient.invalidateQueries({
                queryKey: canvasAgentKeys.workflows(),
              });
              return;
            }

            if (rawEvent.type === "agent_disabled") {
              setStreamState("idle");
              await queryClient.invalidateQueries({
                queryKey: canvasAgentKeys.workflows(),
              });
              toast.info(rawEvent.message);
              return;
            }

            if (rawEvent.type === "run_started") {
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
              setStreamState("saving");
              replaceMessage(
                queryClient,
                input.workflowId,
                (message) => message.id === streamMessageId(rawEvent.runId),
                rawEvent.message,
              );
              return;
            }

            if (rawEvent.type === "proposal_created") {
              upsertProposal(queryClient, input.workflowId, rawEvent.proposal);
              return;
            }

            if (rawEvent.type === "run_completed") {
              upsertRun(queryClient, input.workflowId, rawEvent.run);
              await queryClient.invalidateQueries({
                queryKey: canvasAgentKeys.workflows(),
              });
              setStreamState("idle");
              return;
            }

            if (rawEvent.type === "run_failed") {
              failed = true;
              setStreamState("failed");
              upsertRun(queryClient, input.workflowId, rawEvent.run);
              removeMessage(
                queryClient,
                input.workflowId,
                (message) => message.id === streamMessageId(rawEvent.run?.id ?? 0),
              );
              toast.error(rawEvent.errorMessage);
            }
          },
        });
      } catch (error) {
        if (!controller.signal.aborted) {
          failed = true;
          setStreamState("failed");
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
          throw error;
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        if (!controller.signal.aborted && !failed) {
          setStreamState("idle");
        }
      }
    },
    [queryClient],
  );

  return {
    start,
    stop,
    streamState,
    isStreaming: streamState === "thinking" || streamState === "streaming",
  };
}
