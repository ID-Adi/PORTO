"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  canvasAgentThreadKeys,
  canvasWorkspaceKeys,
} from "./canvas-agent-query-keys";
import { useCanvasAgentStream } from "./canvas-agent-stream";
import { applyProposalChanges, collectFrameRefs } from "./canvas-agent-utils";
import {
  AGENT_THREAD_STALE_TIME_MS,
  ensureAgentThreadSnapshot,
} from "./canvas-workspace-prefetch";

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

const canvasAgentConfigKey = ["canvasAgent", "config"] as const;
const canvasAgentLocalModelsKey = ["canvasAgent", "localModels"] as const;
const STALE_RUN_TIMEOUT_MS = 5 * 60_000;

function runTime(value: string | Date | null | undefined) {
  if (!value) return 0;
  return new Date(value).getTime();
}

function isRunActive(run: RunRow) {
  return run.status === "pending" || run.status === "running";
}

function isRunStale(run: RunRow, now = Date.now()) {
  const base = runTime(run.updatedAt) || runTime(run.startedAt) || runTime(run.createdAt);
  return base > 0 && now - base > STALE_RUN_TIMEOUT_MS;
}

export function useCanvasAgentWorkspaces(args: {
  enabled: boolean;
  activeWorkspaceId: number | null;
  switchWorkspace: (id: number | null) => Promise<void>;
}) {
  const queryClient = useQueryClient();
  const workspacesQuery = useQuery({
    queryKey: canvasWorkspaceKeys.workspaces(),
    queryFn: canvasAgentApi.listWorkflows,
    enabled: args.enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const workspaces = useMemo(
    () => sortWorkflowRows(workspacesQuery.data ?? []),
    [workspacesQuery.data],
  );

  const createWorkflowMutation = useMutation({
    mutationFn: (title: string | undefined) =>
      canvasAgentApi.createWorkflow({ title: title ?? "Untitled workspace" }),
    onSuccess: async (row) => {
      patchWorkflowList(queryClient, (rows) => [row, ...rows]);
      await args.switchWorkspace(row.id);
    },
  });

  const updateWorkflowMutation = useMutation({
    mutationFn: canvasAgentApi.updateWorkflow,
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: canvasWorkspaceKeys.workspaces() });
      const previous = queryClient.getQueryData<WorkflowRow[]>(
        canvasWorkspaceKeys.workspaces(),
      );
      patchWorkflowList(queryClient, (rows) =>
        rows.map((row) => (row.id === next.id ? { ...row, ...next } : row)),
      );
      return { previous };
    },
    onError: (_error, _next, context) => {
      queryClient.setQueryData(canvasWorkspaceKeys.workspaces(), context?.previous);
    },
    onSuccess: (row) => {
      patchWorkflowList(queryClient, (rows) =>
        rows.map((item) => (item.id === row.id ? row : item)),
      );
      queryClient.setQueryData(canvasWorkspaceKeys.workspace(row.id), row);
    },
  });

  const deleteWorkflowMutation = useMutation({
    mutationFn: canvasAgentApi.deleteWorkflow,
    onSuccess: async (_result, id) => {
      patchWorkflowList(queryClient, (rows) =>
        rows.filter((workspace) => workspace.id !== id),
      );
      queryClient.removeQueries({ queryKey: canvasWorkspaceKeys.workspace(id) });
      queryClient.removeQueries({ queryKey: canvasWorkspaceKeys.scene(id) });
      queryClient.removeQueries({ queryKey: canvasAgentThreadKeys.thread(id) });
      if (id === args.activeWorkspaceId) {
        const fallback = workspaces.find((workspace) => workspace.id !== id);
        await args.switchWorkspace(fallback?.id ?? null);
      }
    },
  });

  const createWorkspace = useCallback(
    (title?: string) => createWorkflowMutation.mutateAsync(title),
    [createWorkflowMutation],
  );

  const renameWorkspace = useCallback(
    async (workspace: WorkflowRow, nextTitle: string) => {
      const title = nextTitle.trim() || "Untitled workspace";
      if (title === workspace.title) return;
      await updateWorkflowMutation.mutateAsync({ id: workspace.id, title });
    },
    [updateWorkflowMutation],
  );

  const togglePinWorkspace = useCallback(
    async (workspace: WorkflowRow) => {
      await updateWorkflowMutation.mutateAsync({
        id: workspace.id,
        isPinned: !workspace.isPinned,
      });
    },
    [updateWorkflowMutation],
  );

  const deleteWorkspace = useCallback(
    (id: number) => deleteWorkflowMutation.mutateAsync(id),
    [deleteWorkflowMutation],
  );

  return {
    workspacesQuery,
    workspaces,
    createWorkspace,
    renameWorkspace,
    togglePinWorkspace,
    deleteWorkspace,
    isBusy:
      createWorkflowMutation.isPending ||
      updateWorkflowMutation.isPending ||
      deleteWorkflowMutation.isPending,
  };
}

export function useCanvasAgentChat(args: {
  enabled: boolean;
  activeWorkspaceId: number | null;
  ensureWorkspace: (title?: string) => Promise<number>;
  apiRef: RefObject<ExcalidrawImperativeAPI | null>;
}) {
  const { enabled, activeWorkspaceId, ensureWorkspace, apiRef } = args;
  const queryClient = useQueryClient();
  const stream = useCanvasAgentStream();
  const workspaceId = activeWorkspaceId;
  const [retryingRunIds, setRetryingRunIds] = useState<Set<number>>(
    () => new Set(),
  );
  const retryingRunIdsRef = useRef<Set<number>>(new Set());

  // Hentikan stream aktif saat user pindah workspace agar tidak ada stream
  // yang bocor memperbarui cache thread lama di background. Jangan abort saat
  // workspace baru dibuat dari null (kirim pesan pertama) — itu justru mematikan
  // stream yang baru dimulai.
  const stopStream = stream.stop;
  const prevWorkspaceIdRef = useRef(workspaceId);
  useEffect(() => {
    const prev = prevWorkspaceIdRef.current;
    prevWorkspaceIdRef.current = workspaceId;
    if (prev !== null && prev !== workspaceId) {
      stopStream();
    }
  }, [workspaceId, stopStream]);

  // Stop versi UI: selain abort stream, tandai run aktif jadi "cancelled" di
  // cache secara optimistis supaya spinner "Agent thinking..." langsung hilang
  // tanpa menunggu polling. Backend juga membatalkan run yang sama via abort.
  const stopStreamAndCancel = useCallback(() => {
    stream.stop();
    if (workspaceId === null) return;
    queryClient.setQueryData<RunRow[]>(
      canvasAgentThreadKeys.runs(workspaceId),
      (rows) =>
        rows?.map((run) =>
          isRunActive(run) ? { ...run, status: "cancelled" } : run,
        ),
    );
  }, [stream, queryClient, workspaceId]);

  const workflowQuery = useQuery({
    queryKey: workspaceId
      ? canvasWorkspaceKeys.workspace(workspaceId)
      : ["disabled", "workspace"],
    queryFn: async () => {
      const snapshot = await ensureAgentThreadSnapshot(
        queryClient,
        workspaceId ?? 0,
      );
      return snapshot.workflow;
    },
    enabled: enabled && workspaceId !== null,
    staleTime: AGENT_THREAD_STALE_TIME_MS,
  });

  const messagesQuery = useInfiniteQuery({
    queryKey: workspaceId
      ? canvasAgentThreadKeys.messages(workspaceId)
      : ["disabled", "messages"],
    queryFn: async ({ pageParam }) => {
      if (pageParam === undefined) {
        const snapshot = await ensureAgentThreadSnapshot(
          queryClient,
          workspaceId ?? 0,
        );
        return {
          items: snapshot.messages.items as CanvasAgentMessage[],
          nextCursor: snapshot.messages.nextCursor,
        };
      }
      const page = await canvasAgentApi.getWorkflowMessages({
        id: workspaceId ?? 0,
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
    enabled: enabled && workspaceId !== null,
    staleTime: AGENT_THREAD_STALE_TIME_MS,
  });

  const runsQuery = useQuery({
    queryKey: workspaceId
      ? canvasAgentThreadKeys.runs(workspaceId)
      : ["disabled", "runs"],
    queryFn: async () => {
      const snapshot = await ensureAgentThreadSnapshot(
        queryClient,
        workspaceId ?? 0,
      );
      return snapshot.runs as RunRow[];
    },
    enabled: enabled && workspaceId !== null,
    staleTime: AGENT_THREAD_STALE_TIME_MS,
    refetchInterval: (query) => {
      const now = Date.now();
      const active = query.state.data?.filter(isRunActive) ?? [];
      return active.some((run) => !isRunStale(run, now)) ? 1_500 : false;
    },
  });

  const proposalsQuery = useQuery({
    queryKey: workspaceId
      ? canvasAgentThreadKeys.proposals(workspaceId)
      : ["disabled", "proposals"],
    queryFn: async () => {
      const snapshot = await ensureAgentThreadSnapshot(
        queryClient,
        workspaceId ?? 0,
      );
      return snapshot.proposals as ProposalRow[];
    },
    enabled: enabled && workspaceId !== null,
    staleTime: AGENT_THREAD_STALE_TIME_MS,
  });

  const retryRunMutation = useMutation({
    mutationFn: canvasAgentApi.retryRun,
    onSuccess: (run) => {
      upsertRun(queryClient, run.workflowId, run);
      void queryClient.invalidateQueries({
        queryKey: canvasAgentThreadKeys.runs(run.workflowId),
      });
    },
  });

  const updateProposalMutation = useMutation({
    mutationFn: canvasAgentApi.updateProposalStatus,
    onMutate: async (next) => {
      const proposalsKey =
        proposalsQuery.data?.find((proposal) => proposal.id === next.id)
          ?.workflowId ?? workspaceId;
      if (!proposalsKey) return {};
      await queryClient.cancelQueries({
        queryKey: canvasAgentThreadKeys.proposals(proposalsKey),
      });
      const previous = queryClient.getQueryData<ProposalRow[]>(
        canvasAgentThreadKeys.proposals(proposalsKey),
      );
      queryClient.setQueryData<ProposalRow[]>(
        canvasAgentThreadKeys.proposals(proposalsKey),
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
        canvasAgentThreadKeys.proposals(context.workflowId),
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
  const activeRuns = runs.filter(isRunActive);
  const staleActiveRuns = activeRuns.filter((run) => isRunStale(run));
  const latestSucceededAt = Math.max(
    0,
    ...runs
      .filter((run) => run.status === "succeeded")
      .map((run) => runTime(run.completedAt) || runTime(run.updatedAt)),
  );
  const failedRuns = runs
    .filter(
      (run) =>
        run.status === "failed" &&
        (runTime(run.createdAt) || runTime(run.updatedAt)) > latestSucceededAt,
    )
    .slice(0, 3);
  const previousActiveRunIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!workspaceId || staleActiveRuns.length === 0) return;
    void queryClient.invalidateQueries({
      queryKey: canvasAgentThreadKeys.runs(workspaceId),
    });
  }, [queryClient, staleActiveRuns.length, workspaceId]);

  useEffect(() => {
    if (!workspaceId) {
      previousActiveRunIdsRef.current = new Set();
      return;
    }

    const activeRunIds = new Set(activeRuns.map((run) => run.id));
    const hadRunSettle = [...previousActiveRunIdsRef.current].some(
      (id) => !activeRunIds.has(id),
    );
    previousActiveRunIdsRef.current = activeRunIds;

    if (!hadRunSettle) return;
    void Promise.all([
      queryClient.invalidateQueries({
        queryKey: canvasAgentThreadKeys.messages(workspaceId),
      }),
      queryClient.invalidateQueries({
        queryKey: canvasAgentThreadKeys.proposals(workspaceId),
      }),
      queryClient.invalidateQueries({
        queryKey: canvasAgentThreadKeys.runs(workspaceId),
      }),
      queryClient.invalidateQueries({
        queryKey: canvasWorkspaceKeys.workspaces(),
      }),
    ]);
  }, [activeRuns, queryClient, workspaceId]);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || stream.isStreaming) return;
      const nextWorkspaceId = workspaceId ?? (await ensureWorkspace());
      const clientMessageId = `${Date.now()}:${Math.random()
        .toString(36)
        .slice(2)}`;
      const frameRefs = collectFrameRefs(apiRef.current, trimmed);
      await stream.start({
        workflowId: nextWorkspaceId,
        content: trimmed,
        frameRefs,
        clientMessageId,
      });
    },
    [apiRef, ensureWorkspace, stream, workspaceId],
  );

  const retryRun = useCallback(
    async (run: RunRow) => {
      if (retryingRunIdsRef.current.has(run.id)) return;
      retryingRunIdsRef.current = new Set(retryingRunIdsRef.current).add(run.id);
      setRetryingRunIds(retryingRunIdsRef.current);
      try {
        await retryRunMutation.mutateAsync(run.id);
      } finally {
        const next = new Set(retryingRunIdsRef.current);
        next.delete(run.id);
        retryingRunIdsRef.current = next;
        setRetryingRunIds(next);
      }
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
      if (!apiRef.current) {
        toast.error("Canvas belum siap");
        return;
      }

      try {
        await applyProposalChanges(
          apiRef.current,
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
    [apiRef, updateProposalMutation],
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
    retryingRunIds,
    proposals: proposalsQuery.data ?? [],
    sendMessage,
    retryRun,
    updateProposalStatus,
    applyProposal,
    streamState: stream.streamState,
    stopStream: stopStreamAndCancel,
    isSending: stream.isStreaming,
    isBusy: retryingRunIds.size > 0 || updateProposalMutation.isPending,
  };
}

export function useCanvasAgentConfig() {
  const queryClient = useQueryClient();

  const configQuery = useQuery({
    queryKey: canvasAgentConfigKey,
    queryFn: canvasAgentApi.getConfig,
  });

  const updateConfigMutation = useMutation({
    mutationFn: canvasAgentApi.updateConfig,
    onSuccess: (data) => {
      queryClient.setQueryData<typeof data | undefined>(
        canvasAgentConfigKey,
        (current) => ({
          ...current,
          ...data,
        }),
      );
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

// Deteksi live model dari endpoint lokal. Disabled by default; di-refetch saat
// dropdown model dibuka agar selalu fresh tanpa polling.
export function useLocalModels() {
  const query = useQuery({
    queryKey: canvasAgentLocalModelsKey,
    queryFn: canvasAgentApi.listLocalModels,
    enabled: false,
    staleTime: 0,
    gcTime: 0,
  });

  return {
    localModels: query.data?.models ?? [],
    localModelsLoading: query.isFetching,
    refetchLocalModels: query.refetch,
  };
}
