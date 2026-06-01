import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type {
  CanvasAgentMessage,
  CanvasAgentMessagePage,
  ProposalRow,
  RunRow,
  WorkflowRow,
} from "./canvas-agent-types";
import { canvasAgentKeys } from "./canvas-agent-query-keys";

type MessagesData = InfiniteData<CanvasAgentMessagePage, number | undefined>;

export function sortWorkflowRows(rows: WorkflowRow[]) {
  return [...rows].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export function patchWorkflowList(
  queryClient: QueryClient,
  updater: (rows: WorkflowRow[]) => WorkflowRow[],
) {
  queryClient.setQueryData<WorkflowRow[]>(canvasAgentKeys.workflows(), (rows) =>
    rows ? sortWorkflowRows(updater(rows)) : rows,
  );
}

export function appendMessage(
  queryClient: QueryClient,
  workflowId: number,
  message: CanvasAgentMessage,
) {
  queryClient.setQueryData<MessagesData>(
    canvasAgentKeys.messages(workflowId),
    (current) => {
      if (!current) {
        return {
          pages: [{ items: [message], nextCursor: null }],
          pageParams: [undefined],
        };
      }
      const pages = current.pages.map((page, index) =>
        index === 0
          ? {
              ...page,
              items: page.items.some((item) => item.id === message.id)
                ? page.items
                : [...page.items, message],
            }
          : page,
      );
      return { ...current, pages };
    },
  );
}

export function replaceMessage(
  queryClient: QueryClient,
  workflowId: number,
  predicate: (message: CanvasAgentMessage) => boolean,
  replacement: CanvasAgentMessage,
) {
  queryClient.setQueryData<MessagesData>(
    canvasAgentKeys.messages(workflowId),
    (current) => {
      if (!current) return current;
      const pages = current.pages.map((page) => ({
        ...page,
        items: page.items.map((message) => {
          if (!predicate(message)) return message;
          return replacement;
        }),
      }));
      return { ...current, pages };
    },
  );
}

export function upsertServerMessage(
  queryClient: QueryClient,
  workflowId: number,
  message: CanvasAgentMessage,
  clientMessageId?: string,
) {
  queryClient.setQueryData<MessagesData>(
    canvasAgentKeys.messages(workflowId),
    (current) => {
      if (!current) {
        return {
          pages: [{ items: [message], nextCursor: null }],
          pageParams: [undefined],
        };
      }

      let inserted = false;
      const pages = current.pages.map((page, pageIndex) => {
        const items: CanvasAgentMessage[] = [];
        for (const item of page.items) {
          if (item.id === message.id) {
            if (!inserted) {
              items.push(message);
              inserted = true;
            }
            continue;
          }

          if (
            clientMessageId &&
            item.metadata?.clientMessageId === clientMessageId
          ) {
            if (!inserted) {
              items.push(message);
              inserted = true;
            }
            continue;
          }

          items.push(item);
        }

        if (!inserted && pageIndex === 0) {
          items.push(message);
          inserted = true;
        }
        return { ...page, items };
      });

      return { ...current, pages };
    },
  );
}

export function updateMessage(
  queryClient: QueryClient,
  workflowId: number,
  predicate: (message: CanvasAgentMessage) => boolean,
  updater: (message: CanvasAgentMessage) => CanvasAgentMessage,
) {
  queryClient.setQueryData<MessagesData>(
    canvasAgentKeys.messages(workflowId),
    (current) => {
      if (!current) return current;
      return {
        ...current,
        pages: current.pages.map((page) => ({
          ...page,
          items: page.items.map((message) =>
            predicate(message) ? updater(message) : message,
          ),
        })),
      };
    },
  );
}

export function removeMessage(
  queryClient: QueryClient,
  workflowId: number,
  predicate: (message: CanvasAgentMessage) => boolean,
) {
  queryClient.setQueryData<MessagesData>(
    canvasAgentKeys.messages(workflowId),
    (current) => {
      if (!current) return current;
      return {
        ...current,
        pages: current.pages.map((page) => ({
          ...page,
          items: page.items.filter((message) => !predicate(message)),
        })),
      };
    },
  );
}

export function upsertRun(
  queryClient: QueryClient,
  workflowId: number,
  run: RunRow | null,
) {
  if (!run) return;
  queryClient.setQueryData<RunRow[]>(canvasAgentKeys.runs(workflowId), (rows) => {
    const current = rows ?? [];
    return [run, ...current.filter((item) => item.id !== run.id)].slice(0, 20);
  });
}

export function upsertProposal(
  queryClient: QueryClient,
  workflowId: number,
  proposal: ProposalRow,
) {
  queryClient.setQueryData<ProposalRow[]>(
    canvasAgentKeys.proposals(workflowId),
    (rows) => {
      const current = rows ?? [];
      return [proposal, ...current.filter((item) => item.id !== proposal.id)];
    },
  );
}
