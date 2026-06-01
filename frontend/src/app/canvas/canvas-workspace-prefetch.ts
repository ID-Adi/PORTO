import type { InfiniteData, QueryClient } from "@tanstack/react-query";

import { canvasAgentApi } from "./canvas-agent-api";
import {
  canvasAgentThreadKeys,
  canvasWorkspaceKeys,
} from "./canvas-agent-query-keys";

import type {
  AgentThreadSnapshot,
  CanvasAgentMessage,
  CanvasAgentMessagePage,
  ProposalRow,
  RunRow,
  WorkflowScene,
} from "./canvas-agent-types";

type MessagesData = InfiniteData<CanvasAgentMessagePage, number | undefined>;

export const WORKSPACE_SCENE_STALE_TIME_MS = 60_000;
export const AGENT_THREAD_STALE_TIME_MS = 10_000;

export function workspaceSceneQueryOptions(workspaceId: number) {
  return {
    queryKey: canvasWorkspaceKeys.scene(workspaceId),
    queryFn: () => canvasAgentApi.getWorkflowScene(workspaceId),
    staleTime: WORKSPACE_SCENE_STALE_TIME_MS,
  };
}

function snapshotQueryOptions(workspaceId: number) {
  return {
    queryKey: canvasAgentThreadKeys.snapshot(workspaceId),
    queryFn: () => canvasAgentApi.getAgentThreadSnapshot(workspaceId),
    staleTime: AGENT_THREAD_STALE_TIME_MS,
  };
}

export function seedAgentThreadSnapshot(
  queryClient: QueryClient,
  workspaceId: number,
  snapshot: AgentThreadSnapshot,
) {
  queryClient.setQueryData(
    canvasWorkspaceKeys.workspace(workspaceId),
    snapshot.workflow,
  );
  queryClient.setQueryData<MessagesData>(
    canvasAgentThreadKeys.messages(workspaceId),
    {
      pages: [
        {
          items: snapshot.messages.items as CanvasAgentMessage[],
          nextCursor: snapshot.messages.nextCursor,
        },
      ],
      pageParams: [undefined],
    },
  );
  queryClient.setQueryData<RunRow[]>(
    canvasAgentThreadKeys.runs(workspaceId),
    snapshot.runs as RunRow[],
  );
  queryClient.setQueryData<ProposalRow[]>(
    canvasAgentThreadKeys.proposals(workspaceId),
    snapshot.proposals as ProposalRow[],
  );
}

export async function ensureAgentThreadSnapshot(
  queryClient: QueryClient,
  workspaceId: number,
): Promise<AgentThreadSnapshot> {
  const snapshot = await queryClient.ensureQueryData<AgentThreadSnapshot>(
    snapshotQueryOptions(workspaceId),
  );
  seedAgentThreadSnapshot(queryClient, workspaceId, snapshot);
  return snapshot;
}

export async function fetchWorkspaceScene(
  queryClient: QueryClient,
  workspaceId: number,
): Promise<WorkflowScene> {
  return queryClient.fetchQuery<WorkflowScene>(
    workspaceSceneQueryOptions(workspaceId),
  );
}

export async function prefetchWorkspaceBundle(
  queryClient: QueryClient,
  workspaceId: number,
) {
  await Promise.allSettled([
    queryClient.prefetchQuery<WorkflowScene>(
      workspaceSceneQueryOptions(workspaceId),
    ),
    ensureAgentThreadSnapshot(queryClient, workspaceId),
  ]);
}
