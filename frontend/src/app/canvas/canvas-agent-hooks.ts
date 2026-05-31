"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import {
  patchWorkflowList,
  sortWorkflowRows,
  upsertProposal,
  upsertRun,
} from "./canvas-agent-cache";
import { canvasAgentApi } from "./canvas-agent-api";
import { canvasAgentKeys } from "./canvas-agent-query-keys";
import { useCanvasAgentStream } from "./canvas-agent-stream";
import { applyProposalChanges, collectFrameRefs } from "./canvas-agent-utils";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { RefObject } from "react";
import type {
  CanvasAgentMessage,
  ProposalChange,
  ProposalRow,
  ProposalStatus,
  RunRow,
  WorkflowRow,
} from "./canvas-agent-types";

export function useCanvasAgentWorkflows(args: {
  enabled: boolean;
  activeWorkflowId: number | null;
  switchWorkflow: (id: number | null) => Promise<void>;
}) {
  const queryClient = useQueryClient();
  const workflowsQuery = useQuery({
    queryKey: canvasAgentKeys.workflows(),
    queryFn: canvasAgentApi.listWorkflows,
    enabled: args.enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const workflows = useMemo(
    () => sortWorkflowRows(workflowsQuery.data ?? []),
    [workflowsQuery.data],
  );

  const createWorkflowMutation = useMutation({
    mutationFn: (title: string | undefined) =>
      canvasAgentApi.createWorkflow({ title: title ?? "Untitled workflow" }),
    onSuccess: async (row) => {
      patchWorkflowList(queryClient, (rows) => [row, ...rows]);
      await args.switchWorkflow(row.id);
    },
  });

  const updateWorkflowMutation = useMutation({
    mutationFn: canvasAgentApi.updateWorkflow,
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: canvasAgentKeys.workflows() });
      const previous = queryClient.getQueryData<WorkflowRow[]>(
        canvasAgentKeys.workflows(),
      );
      patchWorkflowList(queryClient, (rows) =>
        rows.map((row) => (row.id === next.id ? { ...row, ...next } : row)),
      );
      return { previous };
    },
    onError: (_error, _next, context) => {
      queryClient.setQueryData(canvasAgentKeys.workflows(), context?.previous);
    },
    onSuccess: (row) => {
      patchWorkflowList(queryClient, (rows) =>
        rows.map((item) => (item.id === row.id ? row : item)),
      );
      queryClient.setQueryData(canvasAgentKeys.workflow(row.id), row);
    },
  });

  const deleteWorkflowMutation = useMutation({
    mutationFn: canvasAgentApi.deleteWorkflow,
    onSuccess: async (_result, id) => {
      patchWorkflowList(queryClient, (rows) =>
        rows.filter((workflow) => workflow.id !== id),
      );
      queryClient.removeQueries({ queryKey: canvasAgentKeys.workflow(id) });
      if (id === args.activeWorkflowId) {
        const fallback = workflows.find((workflow) => workflow.id !== id);
        await args.switchWorkflow(fallback?.id ?? null);
      }
    },
  });

  const createWorkflow = useCallback(
    (title?: string) => createWorkflowMutation.mutateAsync(title),
    [createWorkflowMutation],
  );

  const renameWorkflow = useCallback(
    async (workflow: WorkflowRow, nextTitle: string) => {
      const title = nextTitle.trim() || "Untitled workflow";
      if (title === workflow.title) return;
      await updateWorkflowMutation.mutateAsync({ id: workflow.id, title });
    },
    [updateWorkflowMutation],
  );

  const togglePinWorkflow = useCallback(
    async (workflow: WorkflowRow) => {
      await updateWorkflowMutation.mutateAsync({
        id: workflow.id,
        isPinned: !workflow.isPinned,
      });
    },
    [updateWorkflowMutation],
  );

  const deleteWorkflow = useCallback(
    (id: number) => deleteWorkflowMutation.mutateAsync(id),
    [deleteWorkflowMutation],
  );

  return {
    workflowsQuery,
    workflows,
    createWorkflow,
    renameWorkflow,
    togglePinWorkflow,
    deleteWorkflow,
    isBusy:
      createWorkflowMutation.isPending ||
      updateWorkflowMutation.isPending ||
      deleteWorkflowMutation.isPending,
  };
}

export function useCanvasAgentChat(args: {
  enabled: boolean;
  activeWorkflowId: number | null;
  ensureWorkflow: (title?: string) => Promise<number>;
  apiRef: RefObject<ExcalidrawImperativeAPI | null>;
}) {
  const queryClient = useQueryClient();
  const stream = useCanvasAgentStream();
  const workflowId = args.activeWorkflowId;

  // Hentikan stream aktif saat user pindah antar-workflow agar tidak ada stream
  // yang bocor memperbarui cache workflow lama di background. Jangan abort saat
  // workflow baru dibuat dari null (kirim pesan pertama) — itu justru mematikan
  // stream yang baru dimulai.
  const stopStream = stream.stop;
  const prevWorkflowIdRef = useRef(workflowId);
  useEffect(() => {
    const prev = prevWorkflowIdRef.current;
    prevWorkflowIdRef.current = workflowId;
    if (prev !== null && prev !== workflowId) {
      stopStream();
    }
  }, [workflowId, stopStream]);

  const workflowQuery = useQuery({
    queryKey: workflowId ? canvasAgentKeys.workflow(workflowId) : ["disabled"],
    queryFn: () => canvasAgentApi.getWorkflowSummary(workflowId ?? 0),
    enabled: args.enabled && workflowId !== null,
  });

  const messagesQuery = useInfiniteQuery({
    queryKey: workflowId ? canvasAgentKeys.messages(workflowId) : ["disabled"],
    queryFn: async ({ pageParam }) => {
      const page = await canvasAgentApi.getWorkflowMessages({
        id: workflowId ?? 0,
        cursor: pageParam,
        limit: 40,
      });
      return {
        items: page.items as CanvasAgentMessage[],
        nextCursor: page.nextCursor,
      };
    },
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: args.enabled && workflowId !== null,
  });

  const runsQuery = useQuery({
    queryKey: workflowId ? canvasAgentKeys.runs(workflowId) : ["disabled"],
    queryFn: () => canvasAgentApi.getWorkflowRuns(workflowId ?? 0),
    enabled: args.enabled && workflowId !== null,
  });

  const proposalsQuery = useQuery({
    queryKey: workflowId ? canvasAgentKeys.proposals(workflowId) : ["disabled"],
    queryFn: () => canvasAgentApi.getWorkflowProposals(workflowId ?? 0),
    enabled: args.enabled && workflowId !== null,
  });

  const retryRunMutation = useMutation({
    mutationFn: canvasAgentApi.retryRun,
    onSuccess: (run) => {
      upsertRun(queryClient, run.workflowId, run);
      void queryClient.invalidateQueries({
        queryKey: canvasAgentKeys.runs(run.workflowId),
      });
    },
  });

  const updateProposalMutation = useMutation({
    mutationFn: canvasAgentApi.updateProposalStatus,
    onMutate: async (next) => {
      const proposalsKey =
        proposalsQuery.data?.find((proposal) => proposal.id === next.id)
          ?.workflowId ?? workflowId;
      if (!proposalsKey) return {};
      await queryClient.cancelQueries({
        queryKey: canvasAgentKeys.proposals(proposalsKey),
      });
      const previous = queryClient.getQueryData<ProposalRow[]>(
        canvasAgentKeys.proposals(proposalsKey),
      );
      queryClient.setQueryData<ProposalRow[]>(
        canvasAgentKeys.proposals(proposalsKey),
        (rows) =>
          rows?.map((proposal) =>
            proposal.id === next.id ? { ...proposal, ...next } : proposal,
          ),
      );
      return { previous, workflowId: proposalsKey };
    },
    onError: (_error, _next, context) => {
      if (!context?.workflowId) return;
      queryClient.setQueryData(
        canvasAgentKeys.proposals(context.workflowId),
        context.previous,
      );
    },
    onSuccess: (proposal) => {
      upsertProposal(queryClient, proposal.workflowId, proposal);
    },
  });

  const messages = useMemo(() => {
    const pages = messagesQuery.data?.pages ?? [];
    return [...pages].reverse().flatMap((page) => page.items);
  }, [messagesQuery.data]);

  const runs = runsQuery.data ?? [];
  const activeRuns = runs.filter(
    (run) => run.status === "pending" || run.status === "running",
  );
  const failedRuns = runs.filter((run) => run.status === "failed").slice(0, 3);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || stream.isStreaming) return;
      const nextWorkflowId = workflowId ?? (await args.ensureWorkflow());
      const clientMessageId = `${Date.now()}:${Math.random()
        .toString(36)
        .slice(2)}`;
      const frameRefs = collectFrameRefs(args.apiRef.current, trimmed);
      await stream.start({
        workflowId: nextWorkflowId,
        content: trimmed,
        frameRefs,
        clientMessageId,
      });
    },
    [args, stream, workflowId],
  );

  const retryRun = useCallback(
    async (run: RunRow) => {
      await retryRunMutation.mutateAsync(run.id);
    },
    [retryRunMutation],
  );

  const updateProposalStatus = useCallback(
    async (proposal: ProposalRow, status: ProposalStatus) => {
      await updateProposalMutation.mutateAsync({ id: proposal.id, status });
    },
    [updateProposalMutation],
  );

  const applyProposal = useCallback(
    async (proposal: ProposalRow) => {
      if (!args.apiRef.current) {
        toast.error("Canvas belum siap");
        return;
      }

      try {
        await applyProposalChanges(
          args.apiRef.current,
          (proposal.changes ?? []) as ProposalChange[],
        );
        await updateProposalMutation.mutateAsync({
          id: proposal.id,
          status: "applied",
        });
        toast.success("Proposal diterapkan ke canvas");
      } catch (error) {
        await updateProposalMutation.mutateAsync({
          id: proposal.id,
          status: "failed",
          errorMessage:
            error instanceof Error ? error.message : "Gagal apply proposal",
        });
        toast.error(
          error instanceof Error ? error.message : "Gagal apply proposal",
        );
      }
    },
    [args.apiRef, updateProposalMutation],
  );

  return {
    workflowQuery,
    messagesQuery,
    runsQuery,
    proposalsQuery,
    workflow: workflowQuery.data ?? null,
    messages,
    runs,
    activeRuns,
    failedRuns,
    proposals: proposalsQuery.data ?? [],
    sendMessage,
    retryRun,
    updateProposalStatus,
    applyProposal,
    streamState: stream.streamState,
    stopStream: stream.stop,
    isSending: stream.isStreaming,
    isBusy: retryRunMutation.isPending || updateProposalMutation.isPending,
  };
}

export function useCanvasAgentConfig() {
  const queryClient = useQueryClient();

  const configQuery = useQuery({
    queryKey: ["canvasAgent", "config"],
    queryFn: canvasAgentApi.getConfig,
  });

  const updateConfigMutation = useMutation({
    mutationFn: canvasAgentApi.updateConfig,
    onSuccess: (data) => {
      queryClient.setQueryData(["canvasAgent", "config"], (prev: any) => ({
        ...prev,
        ...data,
      }));
      void queryClient.invalidateQueries({ queryKey: ["canvasAgent"] });
      toast.success(`Model aktif diganti ke ${data.model} (${data.provider})`);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Gagal mengganti model");
    },
  });

  return {
    config: configQuery.data ?? null,
    isLoading: configQuery.isLoading,
    updateConfig: updateConfigMutation.mutate,
    isUpdating: updateConfigMutation.isPending,
  };
}
