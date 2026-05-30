"use client";

import { CaptureUpdateAction } from "@excalidraw/excalidraw";
import {
  Bot,
  Check,
  History,
  Loader2,
  Pin,
  PinOff,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

import { useCanvasWorkflow } from "./canvas-workflow-context";

import type { AppRouter } from "@porto/api";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type {
  ExcalidrawFrameElement,
  OrderedExcalidrawElement,
} from "@excalidraw/excalidraw/element/types";
import type { inferRouterOutputs } from "@trpc/server";
import type { RefObject } from "react";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type WorkflowRow = RouterOutputs["canvasAgent"]["listWorkflows"][number];
type WorkflowDetail = RouterOutputs["canvasAgent"]["getWorkflow"];
type MessageRow = WorkflowDetail["messages"][number];
type ProposalRow = WorkflowDetail["proposals"][number];
type ProposalStatus =
  | "pending_approval"
  | "approved"
  | "rejected"
  | "applied"
  | "failed";

type FrameRef = {
  id: string;
  name: string | null;
  mention: string;
  elementIds: string[];
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

type ProposalChange =
  | { type: "add"; element: unknown }
  | { type: "update"; elementId: string; patch: Record<string, unknown> }
  | { type: "delete"; elementId: string };

type CanvasAgentPanelProps = {
  apiRef: RefObject<ExcalidrawImperativeAPI | null>;
  isAuthed: boolean;
  enabled: boolean;
};

function normalizeMention(value: string) {
  return value
    .replace(/^@/, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function mentionFromName(name: string | null, index: number) {
  const rawName = name?.trim() || `Frame ${index + 1}`;
  const normalized = normalizeMention(rawName).replace(/[^a-z0-9_-]/g, "");
  return `@${normalized || `frame_${index + 1}`}`;
}

function extractMentions(content: string) {
  const mentions = new Set<string>();
  for (const match of content.matchAll(/@([a-zA-Z0-9_-]+)/g)) {
    mentions.add(normalizeMention(match[1]));
  }
  return mentions;
}

function isFrame(
  element: OrderedExcalidrawElement,
): element is OrderedExcalidrawElement & ExcalidrawFrameElement {
  return element.type === "frame";
}

function collectFrameRefs(
  api: ExcalidrawImperativeAPI | null,
  content: string,
): FrameRef[] {
  if (!api) return [];
  const elements = api.getSceneElements().filter((element) => !element.isDeleted);
  const frames = elements.filter(isFrame);
  const mentions = extractMentions(content);

  const refs = frames.map((frame, index) => {
    const elementIds = elements
      .filter((element) => element.frameId === frame.id)
      .map((element) => element.id);
    return {
      id: frame.id,
      name: frame.name,
      mention: mentionFromName(frame.name, index),
      elementIds,
      bounds: {
        x: frame.x,
        y: frame.y,
        width: frame.width,
        height: frame.height,
      },
    };
  });

  if (mentions.size > 0) {
    return refs.filter((ref) => {
      const keys = [
        normalizeMention(ref.mention),
        ref.name ? normalizeMention(ref.name) : "",
      ];
      return keys.some((key) => mentions.has(key));
    });
  }

  return [];
}

function formatTimestamp(value: Date | string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function sortWorkflowRows(rows: WorkflowRow[]) {
  return [...rows].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

function buildAssistantDraft(content: string, frameRefs: FrameRef[]) {
  const frameNames = frameRefs.map((frame) => frame.name || frame.mention);
  const target = frameNames.length > 0 ? frameNames.join(", ") : "canvas";
  const mentionHint =
    frameRefs.length > 0
      ? `Saya membaca konteks ${target}.`
      : "Belum ada frame yang terhubung. Gunakan @nama_frame atau pilih frame di canvas.";

  return {
    content: [
      mentionHint,
      "Saya buat proposal awal tanpa mengubah canvas langsung.",
      `Brief user: ${content}`,
    ].join("\n\n"),
    proposal: {
      summary:
        frameRefs.length > 0
          ? `Proposal bantuan untuk ${target}`
          : "Proposal awal agent canvas",
      frameIds: frameRefs.map((frame) => frame.id),
      changes: [] as ProposalChange[],
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function applyProposalChanges(
  api: ExcalidrawImperativeAPI,
  changes: ProposalChange[],
) {
  const deleteIds = new Set(
    changes
      .filter((change): change is Extract<ProposalChange, { type: "delete" }> => {
        return change.type === "delete";
      })
      .map((change) => change.elementId),
  );
  const updatePatches = new Map(
    changes
      .filter((change): change is Extract<ProposalChange, { type: "update" }> => {
        return change.type === "update";
      })
      .map((change) => [change.elementId, change.patch]),
  );
  const additions = changes
    .filter((change): change is Extract<ProposalChange, { type: "add" }> => {
      return change.type === "add" && isRecord(change.element);
    })
    .map((change) => change.element as OrderedExcalidrawElement);

  const now = Date.now();
  const elements = api.getSceneElements().map((element) => {
    if (deleteIds.has(element.id)) {
      return { ...element, isDeleted: true, updated: now };
    }

    const patch = updatePatches.get(element.id);
    if (!patch) return element;
    return { ...element, ...patch, updated: now } as OrderedExcalidrawElement;
  });

  api.updateScene({
    elements: [...elements, ...additions],
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
}

function MessageBubble({ message }: { message: MessageRow }) {
  const frameRefs = (message.frameRefs ?? []) as FrameRef[];
  return (
    <div
      className={cn(
        "canvas-agent-message",
        message.role === "user" && "canvas-agent-message-user",
      )}
    >
      <div className="canvas-agent-message-kicker">
        <span>{message.role}</span>
        <span>{formatTimestamp(message.createdAt)}</span>
      </div>
      <p>{message.content}</p>
      {frameRefs.length > 0 ? (
        <div className="canvas-agent-frame-chips">
          {frameRefs.map((frame) => (
            <span key={frame.id}>{frame.mention}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ProposalItem({
  proposal,
  busy,
  onStatus,
  onApply,
}: {
  proposal: ProposalRow;
  busy: boolean;
  onStatus: (status: ProposalStatus) => void;
  onApply: () => void;
}) {
  const changes = (proposal.changes ?? []) as ProposalChange[];
  return (
    <div className="canvas-agent-proposal">
      <div className="canvas-agent-proposal-head">
        <div>
          <span className="canvas-agent-section-kicker">proposal</span>
          <h4>{proposal.summary}</h4>
        </div>
        <span className="canvas-agent-status-pill">{proposal.status}</span>
      </div>
      <p>
        {proposal.frameIds.length} frame linked / {changes.length} change
      </p>
      <div className="canvas-agent-proposal-actions">
        {proposal.status === "pending_approval" ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => onStatus("approved")}
            >
              <Check aria-hidden />
              Approve
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => onStatus("rejected")}
            >
              <X aria-hidden />
              Reject
            </Button>
          </>
        ) : null}
        {proposal.status === "approved" ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={onApply}
          >
            <Check aria-hidden />
            Apply
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function CanvasAgentPanel({
  apiRef,
  isAuthed,
  enabled,
}: CanvasAgentPanelProps) {
  const utils = trpc.useUtils();
  // Workflow aktif dibagikan dengan canvas (canvas-client) lewat context, jadi
  // ganti workflow di sini juga memuat scene canvas-nya (unifikasi 2-arah).
  const { activeWorkflowId, switchWorkflow, ensureWorkflow } =
    useCanvasWorkflow();
  const [input, setInput] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WorkflowRow | null>(null);

  const configQuery = trpc.canvasAgent.getConfig.useQuery(undefined, {
    enabled: enabled && isAuthed,
    staleTime: 60_000,
  });
  const workflowsQuery = trpc.canvasAgent.listWorkflows.useQuery(undefined, {
    enabled: enabled && isAuthed,
  });
  const workflows = useMemo(
    () => workflowsQuery.data ?? [],
    [workflowsQuery.data],
  );
  const workflowQuery = trpc.canvasAgent.getWorkflow.useQuery(
    { id: activeWorkflowId ?? 0 },
    { enabled: enabled && isAuthed && activeWorkflowId !== null },
  );

  const createWorkflowMutation = trpc.canvasAgent.createWorkflow.useMutation();
  const updateWorkflowMutation = trpc.canvasAgent.updateWorkflow.useMutation();
  const deleteWorkflowMutation = trpc.canvasAgent.deleteWorkflow.useMutation();
  const addMessageMutation = trpc.canvasAgent.addMessage.useMutation();
  const saveAssistantMutation =
    trpc.canvasAgent.saveAssistantMessage.useMutation();
  const updateProposalMutation =
    trpc.canvasAgent.updateProposalStatus.useMutation();

  const activeWorkflow = workflowQuery.data?.workflow ?? null;
  const busy =
    createWorkflowMutation.isPending ||
    updateWorkflowMutation.isPending ||
    deleteWorkflowMutation.isPending ||
    addMessageMutation.isPending ||
    saveAssistantMutation.isPending ||
    updateProposalMutation.isPending;

  const activeWorkflowRow = useMemo(() => {
    if (activeWorkflowId === null) return null;
    return workflows.find((workflow) => workflow.id === activeWorkflowId) ?? null;
  }, [activeWorkflowId, workflows]);
  const activeWorkflowTitle =
    activeWorkflow?.title ?? activeWorkflowRow?.title ?? "Workflow baru";
  const activeWorkflowUpdatedAt =
    activeWorkflow?.updatedAt ?? activeWorkflowRow?.updatedAt ?? null;
  const activeWorkflowMeta = activeWorkflowUpdatedAt
    ? formatTimestamp(activeWorkflowUpdatedAt)
    : "belum ada percakapan";

  const invalidateWorkflow = useCallback(
    (id: number | null) => {
      void utils.canvasAgent.listWorkflows.invalidate();
      if (id !== null) {
        void utils.canvasAgent.getWorkflow.invalidate({ id });
      }
    },
    [utils],
  );

  // "+ Workflow baru" eksplisit → buat lalu pindah (canvas jadi blank).
  const createWorkflow = useCallback(
    async (title = "Untitled workflow") => {
      const row = await createWorkflowMutation.mutateAsync({ title });
      invalidateWorkflow(row.id);
      await switchWorkflow(row.id);
      return row;
    },
    [createWorkflowMutation, invalidateWorkflow, switchWorkflow],
  );

  async function commitWorkflowTitle(workflow: WorkflowRow, nextTitle: string) {
    if (nextTitle.trim() === workflow.title) return;
    const title = nextTitle.trim() || "Untitled workflow";
    try {
      await updateWorkflowMutation.mutateAsync({
        id: workflow.id,
        title,
      });
      invalidateWorkflow(workflow.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal rename workflow");
    }
  }

  async function handleCreateWorkflow() {
    try {
      await createWorkflow();
      toast.success("Workflow agent dibuat");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal membuat workflow");
    }
  }

  async function handleTogglePin(workflow: WorkflowRow) {
    try {
      const row = await updateWorkflowMutation.mutateAsync({
        id: workflow.id,
        isPinned: !workflow.isPinned,
      });
      utils.canvasAgent.listWorkflows.setData(undefined, (current) => {
        if (!current) return current;
        return sortWorkflowRows(
          current.map((item) =>
            item.id === row.id ? { ...item, isPinned: row.isPinned } : item,
          ),
        );
      });
      invalidateWorkflow(workflow.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal pin workflow");
    }
  }

  function requestDeleteWorkflow(workflow: WorkflowRow) {
    setDeleteTarget(workflow);
  }

  async function handleDeleteWorkflow(workflowId: number) {
    if (!workflowId) return;
    try {
      await deleteWorkflowMutation.mutateAsync({ id: workflowId });
      if (workflowId === activeWorkflowId) {
        const fallback = workflows.find((workflow) => workflow.id !== workflowId);
        await switchWorkflow(fallback?.id ?? null);
      }
      setDeleteTarget(null);
      invalidateWorkflow(workflowId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal hapus workflow");
    }
  }

  async function handleSend() {
    const content = input.trim();
    if (!content || busy) return;
    try {
      // Pastikan ada workflow aktif TANPA mengosongkan kanvas (adopsi scene
      // saat ini bila workflow baru dibuat).
      const workflowId = activeWorkflow?.id ?? (await ensureWorkflow());
      const currentTitle = activeWorkflow?.title ?? "Untitled workflow";
      const frameRefs = collectFrameRefs(apiRef.current, content);
      await addMessageMutation.mutateAsync({
        workflowId,
        content,
        frameRefs,
        metadata: {
          source: "canvas-agent-panel",
        },
      });

      if (currentTitle === "Untitled workflow") {
        await updateWorkflowMutation.mutateAsync({
          id: workflowId,
          title: content.slice(0, 72),
        });
      }

      if (frameRefs.length > 0) {
        const draft = buildAssistantDraft(content, frameRefs);
        await saveAssistantMutation.mutateAsync({
          workflowId,
          content: draft.content,
          frameRefs,
          metadata: {
            source: "local-draft",
            provider: configQuery.data?.provider ?? null,
            model: configQuery.data?.model ?? null,
          },
          proposal: draft.proposal,
        });
      }

      setInput("");
      invalidateWorkflow(workflowId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengirim chat");
    }
  }

  async function handleProposalStatus(
    proposal: ProposalRow,
    status: ProposalStatus,
  ) {
    try {
      await updateProposalMutation.mutateAsync({
        id: proposal.id,
        status,
      });
      invalidateWorkflow(proposal.workflowId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal update proposal");
    }
  }

  async function handleApplyProposal(proposal: ProposalRow) {
    if (!apiRef.current) {
      toast.error("Canvas belum siap");
      return;
    }

    try {
      applyProposalChanges(
        apiRef.current,
        (proposal.changes ?? []) as ProposalChange[],
      );
      await updateProposalMutation.mutateAsync({
        id: proposal.id,
        status: "applied",
      });
      invalidateWorkflow(proposal.workflowId);
      toast.success("Proposal diterapkan ke canvas");
    } catch (error) {
      await updateProposalMutation.mutateAsync({
        id: proposal.id,
        status: "failed",
        errorMessage:
          error instanceof Error ? error.message : "Gagal apply proposal",
      });
      invalidateWorkflow(proposal.workflowId);
      toast.error(error instanceof Error ? error.message : "Gagal apply proposal");
    }
  }

  if (!isAuthed) {
    return (
      <div className="canvas-agent-panel canvas-agent-panel-empty">
        <Bot aria-hidden className="size-5" />
        <p>Login dulu untuk memakai Agent canvas.</p>
      </div>
    );
  }

  return (
    <>
      <div className="canvas-agent-panel">
      <header className="canvas-agent-header">
        <div>
          <span className="canvas-agent-section-kicker">active workflow</span>
          <h3 title={activeWorkflowTitle}>{activeWorkflowTitle}</h3>
          <p>{activeWorkflowMeta}</p>
        </div>
        <div className="canvas-agent-header-actions">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="New workflow"
            title="New workflow"
            className="canvas-agent-icon-button"
            disabled={busy}
            onClick={handleCreateWorkflow}
          >
            <Plus aria-hidden />
          </Button>
          <DropdownMenu
            modal={false}
            open={historyOpen}
            onOpenChange={setHistoryOpen}
          >
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Workflow history"
                title="Workflow history"
                className="canvas-agent-icon-button"
                disabled={busy}
              >
                <History aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={8}
              className="canvas-agent-history-menu"
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <div className="canvas-agent-history-sticky">
                <DropdownMenuLabel>Workflow history</DropdownMenuLabel>
                <div className="canvas-agent-history-current">
                  <span>Active</span>
                  <strong title={activeWorkflowTitle}>{activeWorkflowTitle}</strong>
                </div>
                <DropdownMenuSeparator />
              </div>
              <DropdownMenuGroup>
                {workflows.length === 0 ? (
                  <DropdownMenuItem disabled>Belum ada workflow</DropdownMenuItem>
                ) : (
                  workflows.map((workflow) => (
                    <div
                      key={workflow.id}
                      role="button"
                      tabIndex={0}
                      className={cn(
                        "canvas-agent-history-item",
                        workflow.id === activeWorkflowId &&
                          "canvas-agent-history-item-active",
                      )}
                      onClick={(event) => {
                        event.stopPropagation();
                      }}
                      onDoubleClick={(event) => {
                        event.stopPropagation();
                        void switchWorkflow(workflow.id);
                        setHistoryOpen(false);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          event.stopPropagation();
                          void switchWorkflow(workflow.id);
                          setHistoryOpen(false);
                        }
                      }}
                    >
                      <div className="canvas-agent-history-copy">
                        <Input
                          key={workflow.id}
                          defaultValue={workflow.title}
                          aria-label={`Rename workflow ${workflow.title}`}
                          onClick={(event) => {
                            event.stopPropagation();
                          }}
                          onFocus={(event) => {
                            event.stopPropagation();
                          }}
                          onBlur={(event) => {
                            void commitWorkflowTitle(
                              workflow,
                              event.currentTarget.value,
                            );
                          }}
                          onKeyDown={(event) => {
                            event.stopPropagation();
                            if (event.key === "Enter") {
                              event.currentTarget.blur();
                            }
                          }}
                        />
                        <small>
                          {workflow.id === activeWorkflowId ? "active / " : ""}
                          {workflow.isPinned ? "pinned / " : ""}
                          {workflow.status === "archived"
                            ? "archived"
                            : formatTimestamp(workflow.updatedAt)}
                        </small>
                      </div>
                      <div className="canvas-agent-history-actions">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="canvas-agent-history-pin-button"
                          data-pinned={workflow.isPinned ? "true" : undefined}
                          disabled={busy}
                          aria-label={
                            workflow.isPinned
                              ? "Unpin workflow"
                              : "Pin workflow"
                          }
                          title={
                            workflow.isPinned
                              ? "Unpin workflow"
                              : "Pin workflow"
                          }
                          onPointerDown={(event) => {
                            event.stopPropagation();
                          }}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            void handleTogglePin(workflow);
                          }}
                          onDoubleClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                          }}
                        >
                          {workflow.isPinned ? (
                            <PinOff aria-hidden />
                          ) : (
                            <Pin aria-hidden />
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="canvas-agent-history-delete-button"
                          disabled={busy}
                          aria-label="Delete workflow"
                          title="Delete workflow"
                          onPointerDown={(event) => {
                            event.stopPropagation();
                          }}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            requestDeleteWorkflow(workflow);
                          }}
                          onDoubleClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                          }}
                        >
                          <Trash2 aria-hidden />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div
        className="canvas-agent-scroll"
        onWheelCapture={(event) => {
          event.stopPropagation();
        }}
        onTouchMoveCapture={(event) => {
          event.stopPropagation();
        }}
      >
        {workflowQuery.isLoading && activeWorkflowId !== null ? (
          <div className="canvas-agent-loading">
            <Loader2 aria-hidden className="size-3.5 animate-spin" />
            Memuat chat
          </div>
        ) : null}

        {workflowQuery.data?.messages.length === 0 ? (
          <div className="canvas-agent-placeholder">
            <Bot aria-hidden className="size-4" />
            <p>Mulai chat, atau mention @nama_frame untuk mengikat Agent ke frame.</p>
          </div>
        ) : null}

        {workflowQuery.data?.messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {workflowQuery.data?.proposals.length ? (
          <div className="canvas-agent-proposals">
            {workflowQuery.data.proposals.map((proposal) => (
              <ProposalItem
                key={proposal.id}
                proposal={proposal}
                busy={busy}
                onStatus={(status) => {
                  void handleProposalStatus(proposal, status);
                }}
                onApply={() => {
                  void handleApplyProposal(proposal);
                }}
              />
            ))}
          </div>
        ) : null}
      </div>

      <form
        className="canvas-agent-composer"
        onWheelCapture={(event) => {
          event.stopPropagation();
        }}
        onTouchMoveCapture={(event) => {
          event.stopPropagation();
        }}
        onSubmit={(event) => {
          event.preventDefault();
          void handleSend();
        }}
      >
        <div
          className="canvas-agent-composer-input"
          onWheelCapture={(event) => {
            event.stopPropagation();
          }}
          onTouchMoveCapture={(event) => {
            event.stopPropagation();
          }}
        >
          <Textarea
            value={input}
            disabled={busy}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Chat Agent. Contoh: bantu rapikan @frame_1"
          />
        </div>
        <Button
          type="submit"
          variant="outline"
          size="icon-lg"
          aria-label="Kirim chat"
          title="Kirim chat"
          disabled={!input.trim() || busy}
        >
          {busy ? (
            <Loader2 aria-hidden className="animate-spin" />
          ) : (
            <Send aria-hidden />
          )}
        </Button>
      </form>
      </div>
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent
          size="sm"
          className="canvas-agent-delete-dialog"
          overlayClassName="canvas-agent-delete-dialog-overlay"
        >
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Trash2 aria-hidden />
            </AlertDialogMedia>
            <AlertDialogTitle>Hapus workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              Workflow{" "}
              <span className="canvas-agent-delete-dialog-title">
                {deleteTarget?.title ?? "Untitled workflow"}
              </span>{" "}
              akan dihapus permanen dari akun ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteWorkflowMutation.isPending}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={!deleteTarget || deleteWorkflowMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (!deleteTarget) return;
                void handleDeleteWorkflow(deleteTarget.id);
              }}
            >
              {deleteWorkflowMutation.isPending ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
