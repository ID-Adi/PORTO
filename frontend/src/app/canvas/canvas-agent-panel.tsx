"use client";

import { Bot, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc";

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
import { Button } from "@/components/ui/button";
import { CanvasAgentComposer } from "./canvas-agent-composer";
import { CanvasAgentHistoryMenu } from "./canvas-agent-history-menu";
import {
  useCanvasAgentChat,
  useCanvasAgentWorkflows,
  useCanvasAgentConfig,
} from "./canvas-agent-hooks";
import { CanvasAgentMessageList } from "./canvas-agent-message-list";
import { CanvasAgentProposalList } from "./canvas-agent-proposal-list";
import { CanvasAgentRunErrors } from "./canvas-agent-run-errors";
import { useCanvasWorkflow } from "./canvas-workflow-context";
import { formatTimestamp } from "./canvas-agent-utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { RefObject } from "react";
import type { WorkflowRow } from "./canvas-agent-types";

type CanvasAgentPanelProps = {
  apiRef: RefObject<ExcalidrawImperativeAPI | null>;
  isAuthed: boolean;
  enabled: boolean;
};

export function CanvasAgentPanel({
  apiRef,
  isAuthed,
  enabled,
}: CanvasAgentPanelProps) {
  const { activeWorkflowId, switchWorkflow, ensureWorkflow } =
    useCanvasWorkflow();
  const utils = trpc.useUtils();
  const [input, setInput] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const { config, updateConfig } = useCanvasAgentConfig();
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [customProvider, setCustomProvider] = useState<"gemini" | "vertex" | "openrouter">("gemini");
  const [customModelId, setCustomModelId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<WorkflowRow | null>(null);
  // Failed run yang disembunyikan user (sesi saja — run tetap ada di DB).
  const [dismissedRunIds, setDismissedRunIds] = useState<Set<number>>(
    () => new Set(),
  );

  const workflowAccess = useCanvasAgentWorkflows({
    enabled: enabled && isAuthed,
    activeWorkflowId,
    switchWorkflow,
  });
  const chat = useCanvasAgentChat({
    enabled: enabled && isAuthed,
    activeWorkflowId,
    ensureWorkflow,
    apiRef,
  });

  const visibleFailedRuns = useMemo(
    () => chat.failedRuns.filter((run) => !dismissedRunIds.has(run.id)),
    [chat.failedRuns, dismissedRunIds],
  );

  // Auto-scroll ke bawah saat pesan/ delta streaming bertambah, tetapi hormati
  // user yang sengaja scroll ke atas membaca riwayat.
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    autoScrollRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }, []);
  useEffect(() => {
    if (!autoScrollRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [chat.messages, chat.streamState, chat.activeRuns.length]);

  const activeWorkflowRow = useMemo(() => {
    if (activeWorkflowId === null) return null;
    return (
      workflowAccess.workflows.find(
        (workflow) => workflow.id === activeWorkflowId,
      ) ?? null
    );
  }, [activeWorkflowId, workflowAccess.workflows]);

  const activeWorkflowTitle =
    chat.workflow?.title ?? activeWorkflowRow?.title ?? "Workflow baru";
  const activeWorkflowUpdatedAt =
    chat.workflow?.updatedAt ?? activeWorkflowRow?.updatedAt ?? null;
  const activeWorkflowMeta = activeWorkflowUpdatedAt
    ? formatTimestamp(activeWorkflowUpdatedAt)
    : "belum ada percakapan";

  const busy = workflowAccess.isBusy || chat.isBusy;

  async function handleCreateWorkflow() {
    try {
      await workflowAccess.createWorkflow("Untitled workflow");
      toast.success("Workflow agent dibuat");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal membuat workflow");
    }
  }

  // Hangatkan cache scene saat hover item history agar switch terasa instan.
  const handlePrefetchWorkflow = useCallback(
    (id: number) => {
      if (id === activeWorkflowId) return;
      void utils.canvasAgent.getWorkflowScene.prefetch({ id });
    },
    [utils, activeWorkflowId],
  );

  function handleSwitchWorkflow(id: number) {
    void switchWorkflow(id)
      .then(() => setHistoryOpen(false))
      .catch((error) => {
        toast.error(
          error instanceof Error ? error.message : "Gagal memuat workflow",
        );
      });
  }

  function handleRenameWorkflow(workflow: WorkflowRow, nextTitle: string) {
    void workflowAccess.renameWorkflow(workflow, nextTitle).catch((error) => {
      toast.error(error instanceof Error ? error.message : "Gagal rename workflow");
    });
  }

  function handleTogglePin(workflow: WorkflowRow) {
    void workflowAccess.togglePinWorkflow(workflow).catch((error) => {
      toast.error(error instanceof Error ? error.message : "Gagal pin workflow");
    });
  }

  async function handleDeleteWorkflow(workflowId: number) {
    try {
      await workflowAccess.deleteWorkflow(workflowId);
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal hapus workflow");
    }
  }

  async function handleSend() {
    const content = input.trim();
    if (!content || chat.isSending) return;
    setInput("");
    try {
      await chat.sendMessage(content);
    } catch (error) {
      // Pulihkan pesan yang gagal HANYA bila composer masih kosong, supaya draf
      // baru yang sedang diketik user tidak tertimpa.
      setInput((current) => (current.trim().length === 0 ? content : current));
      toast.error(error instanceof Error ? error.message : "Gagal mengirim chat");
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
            <CanvasAgentHistoryMenu
              open={historyOpen}
              onOpenChange={setHistoryOpen}
              workflows={workflowAccess.workflows}
              activeWorkflowId={activeWorkflowId}
              activeWorkflowTitle={activeWorkflowTitle}
              busy={busy}
              onSwitchWorkflow={handleSwitchWorkflow}
              onPrefetchWorkflow={handlePrefetchWorkflow}
              onRenameWorkflow={handleRenameWorkflow}
              onTogglePin={handleTogglePin}
              onDeleteWorkflow={setDeleteTarget}
            />
          </div>
        </header>

        <div
          ref={scrollRef}
          className="canvas-agent-scroll"
          onScroll={handleScroll}
          onWheelCapture={(event) => {
            event.stopPropagation();
          }}
          onTouchMoveCapture={(event) => {
            event.stopPropagation();
          }}
        >
          <CanvasAgentMessageList
            messages={chat.messages}
            isLoading={chat.messagesQuery.isLoading && activeWorkflowId !== null}
            isFetchingNextPage={chat.messagesQuery.isFetchingNextPage}
            hasNextPage={Boolean(chat.messagesQuery.hasNextPage)}
            onLoadMore={() => {
              void chat.messagesQuery.fetchNextPage();
            }}
            activeRunCount={chat.activeRuns.length}
            hasLiveActivity={chat.activeRuns.length > 0 || chat.streamState !== "idle"}
          />
          <CanvasAgentRunErrors
            runs={visibleFailedRuns}
            retryingRunIds={chat.retryingRunIds}
            onRetry={(run) => {
              void chat.retryRun(run).catch((error) => {
                toast.error(
                  error instanceof Error ? error.message : "Gagal retry agent",
                );
              });
            }}
            onDismiss={(run) => {
              setDismissedRunIds((prev) => {
                const next = new Set(prev);
                next.add(run.id);
                return next;
              });
            }}
          />
          <CanvasAgentProposalList
            proposals={chat.proposals}
            busy={chat.isBusy}
            onStatus={(proposal, status) => {
              void chat.updateProposalStatus(proposal, status).catch((error) => {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "Gagal update proposal",
                );
              });
            }}
            onApply={(proposal) => {
              void chat.applyProposal(proposal);
            }}
          />
        </div>

        <CanvasAgentComposer
          input={input}
          onInputChange={setInput}
          onSubmit={handleSend}
          onStop={chat.stopStream}
          isSending={chat.isSending}
          streamState={chat.streamState}
          activeProvider={config?.provider}
          activeModel={config?.model}
          config={config}
          onSelectModel={(provider, model) => updateConfig({ provider, model })}
          onOpenCustomModal={() => {
            if (config) {
              // Guard: ensure the pre-selected provider is actually active.
              // If it's not, fall back to the first active provider.
              const providerActive =
                (config.provider === "gemini" && config.geminiActive) ||
                (config.provider === "vertex" && config.vertexActive) ||
                (config.provider === "openrouter" && config.openrouterActive);
              const fallbackProvider = config.geminiActive
                ? "gemini"
                : config.vertexActive
                  ? "vertex"
                  : config.openrouterActive
                    ? "openrouter"
                    : "gemini";
              setCustomProvider(providerActive ? config.provider : fallbackProvider);
              setCustomModelId(providerActive ? config.model : "");
            }
            setIsCustomOpen(true);
          }}
        />
      </div>

      <Dialog open={isCustomOpen} onOpenChange={setIsCustomOpen}>
        <DialogContent className="max-w-sm font-mono border border-line bg-popover p-6 rounded-none shadow-none text-popover-foreground">
          <DialogHeader className="border-b border-line pb-4 mb-4">
            <DialogTitle className="text-[12px] font-bold tracking-widest uppercase text-foreground">Set Model Kustom</DialogTitle>
            <DialogDescription className="text-[11px] text-muted-foreground leading-relaxed mt-1">
              Masukkan ID model kustom sesuai dengan provider aktif Anda.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 text-xs">
            <div className="grid gap-1">
              <label className="text-[9px] text-muted-foreground uppercase tracking-widest">Provider</label>
              <select
                value={customProvider}
                onChange={(e) => setCustomProvider(e.target.value as any)}
                className="h-9 w-full border border-line bg-background px-3 outline-none focus:border-foreground rounded-none text-xs text-foreground"
              >
                {config?.geminiActive && <option value="gemini">Gemini</option>}
                {config?.vertexActive && <option value="vertex">Vertex AI</option>}
                {config?.openrouterActive && <option value="openrouter">OpenRouter</option>}
              </select>
            </div>
            <div className="grid gap-1">
              <label className="text-[9px] text-muted-foreground uppercase tracking-widest">Model ID</label>
              <input
                type="text"
                value={customModelId}
                onChange={(e) => setCustomModelId(e.target.value)}
                placeholder={
                  customProvider === "openrouter"
                    ? "Contoh: x-ai/grok-4.1-fast"
                    : "Contoh: gemini-3.5-flash"
                }
                className="h-9 w-full border border-line bg-background px-3 outline-none focus:border-foreground rounded-none text-xs text-foreground"
              />
              {customProvider === "vertex" && (
                <p className="text-[9px] text-muted-foreground leading-relaxed mt-1">
                  Vertex AI membutuhkan <strong>Project ID</strong> yang diisi di API Settings.
                  Pastikan project ID sudah dikonfigurasi sebelum menggunakan model Vertex.
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="border-t border-line pt-4 mt-4">
            <Button variant="outline" size="sm" className="rounded-none text-xs" onClick={() => setIsCustomOpen(false)}>
              Batal
            </Button>
            <Button
              variant="default"
              size="sm"
              className="rounded-none text-xs"
              disabled={!customModelId.trim()}
              onClick={() => {
                updateConfig({ provider: customProvider, model: customModelId.trim() });
                setIsCustomOpen(false);
              }}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
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
            <AlertDialogCancel disabled={workflowAccess.isBusy}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={!deleteTarget || workflowAccess.isBusy}
              onClick={(event) => {
                event.preventDefault();
                if (!deleteTarget) return;
                void handleDeleteWorkflow(deleteTarget.id);
              }}
            >
              {workflowAccess.isBusy ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
