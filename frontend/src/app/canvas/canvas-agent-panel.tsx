"use client";

import { Bot, Plus, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

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
  useCanvasAgentWorkspaces,
  useCanvasAgentConfig,
  useLocalModels,
} from "./canvas-agent-hooks";
import { CanvasAgentMessageList } from "./canvas-agent-message-list";
import { CanvasAgentProposalList } from "./canvas-agent-proposal-list";
import { CanvasAgentRunErrors } from "./canvas-agent-run-errors";
import { useCanvasWorkspace } from "./canvas-workspace-context";
import { formatTimestamp } from "./canvas-agent-utils";
import { prefetchWorkspaceBundle } from "./canvas-workspace-prefetch";
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
  const { activeWorkspaceId, switchWorkspace, ensureWorkspace } =
    useCanvasWorkspace();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const { config, updateConfig } = useCanvasAgentConfig();
  const { localModels, localModelsLoading, refetchLocalModels } =
    useLocalModels();
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [customProvider, setCustomProvider] = useState<
    "gemini" | "vertex" | "openrouter" | "local" | "9router"
  >("gemini");
  const [customModelId, setCustomModelId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<WorkflowRow | null>(null);
  // Failed run yang disembunyikan user (sesi saja — run tetap ada di DB).
  const [dismissedRunIds, setDismissedRunIds] = useState<Set<number>>(
    () => new Set(),
  );

  const workspaceAccess = useCanvasAgentWorkspaces({
    enabled: enabled && isAuthed,
    activeWorkspaceId,
    switchWorkspace,
  });
  const chat = useCanvasAgentChat({
    enabled: enabled && isAuthed,
    activeWorkspaceId,
    ensureWorkspace,
    apiRef,
  });

  const visibleFailedRuns = useMemo(
    () => chat.failedRuns.filter((run) => !dismissedRunIds.has(run.id)),
    [chat.failedRuns, dismissedRunIds],
  );

  // Auto-scroll ke bawah saat pesan/ delta streaming bertambah, tetapi hormati
  // user yang sengaja scroll ke atas membaca riwayat.
  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  // Excalidraw memasang handler copy/cut (React) di wrapper-nya; panel agent ada
  // di dalam DOM itu, sehingga menyalin teks chat malah memicu clipboard scene
  // Excalidraw ({"type":"excalidraw/clipboard",...}). Hentikan propagasi event
  // copy/cut yang berasal dari dalam panel agar copy teks native tetap jalan.
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const stop = (event: Event) => event.stopPropagation();
    el.addEventListener("copy", stop);
    el.addEventListener("cut", stop);
    return () => {
      el.removeEventListener("copy", stop);
      el.removeEventListener("cut", stop);
    };
  }, []);
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

  const activeWorkspaceRow = useMemo(() => {
    if (activeWorkspaceId === null) return null;
    return (
      workspaceAccess.workspaces.find(
        (workspace) => workspace.id === activeWorkspaceId,
      ) ?? null
    );
  }, [activeWorkspaceId, workspaceAccess.workspaces]);

  const activeWorkspaceTitle =
    chat.workflow?.title ?? activeWorkspaceRow?.title ?? "Workspace baru";
  const activeWorkspaceMetaAt =
    chat.workflow?.updatedAt ?? activeWorkspaceRow?.updatedAt ?? null;
  const activeWorkspaceMeta = activeWorkspaceMetaAt
    ? formatTimestamp(activeWorkspaceMetaAt)
    : "belum ada percakapan";

  const busy = workspaceAccess.isBusy || chat.isBusy;

  async function handleCreateWorkspace() {
    try {
      await workspaceAccess.createWorkspace("Untitled workspace");
      toast.success("Workspace agent dibuat");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal membuat workspace");
    }
  }

  // Hangatkan cache scene + thread saat hover item history agar switch terasa instan.
  const handlePrefetchWorkspace = useCallback(
    (id: number) => {
      if (id === activeWorkspaceId) return;
      void prefetchWorkspaceBundle(queryClient, id);
    },
    [queryClient, activeWorkspaceId],
  );

  function handleSwitchWorkspace(id: number) {
    void prefetchWorkspaceBundle(queryClient, id);
    void switchWorkspace(id)
      .then(() => setHistoryOpen(false))
      .catch((error) => {
        toast.error(
          error instanceof Error ? error.message : "Gagal memuat workspace",
        );
      });
  }

  function handleRenameWorkspace(workspace: WorkflowRow, nextTitle: string) {
    void workspaceAccess.renameWorkspace(workspace, nextTitle).catch((error) => {
      toast.error(error instanceof Error ? error.message : "Gagal rename workspace");
    });
  }

  function handleTogglePin(workspace: WorkflowRow) {
    void workspaceAccess.togglePinWorkspace(workspace).catch((error) => {
      toast.error(error instanceof Error ? error.message : "Gagal pin workspace");
    });
  }

  async function handleDeleteWorkspace(workspaceId: number) {
    try {
      await workspaceAccess.deleteWorkspace(workspaceId);
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal hapus workspace");
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
      <div className="canvas-agent-panel" ref={panelRef}>
        <header className="canvas-agent-header">
          <div>
            <span className="canvas-agent-section-kicker">active workspace</span>
            <h3 title={activeWorkspaceTitle}>{activeWorkspaceTitle}</h3>
            <p>{activeWorkspaceMeta}</p>
          </div>
          <div className="canvas-agent-header-actions">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="New workspace"
              title="New workspace"
              className="canvas-agent-icon-button"
              disabled={busy}
              onClick={handleCreateWorkspace}
            >
              <Plus aria-hidden />
            </Button>
            <CanvasAgentHistoryMenu
              open={historyOpen}
              onOpenChange={setHistoryOpen}
              workspaces={workspaceAccess.workspaces}
              activeWorkspaceId={activeWorkspaceId}
              activeWorkspaceTitle={activeWorkspaceTitle}
              busy={busy}
              onSwitchWorkspace={handleSwitchWorkspace}
              onPrefetchWorkspace={handlePrefetchWorkspace}
              onRenameWorkspace={handleRenameWorkspace}
              onTogglePin={handleTogglePin}
              onDeleteWorkspace={setDeleteTarget}
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
            isLoading={chat.messagesQuery.isLoading && activeWorkspaceId !== null}
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
          localModels={localModels}
          localModelsLoading={localModelsLoading}
          onModelMenuOpenChange={(open) => {
            if (open && config?.localActive) refetchLocalModels();
          }}
          onSelectModel={(provider, model) => updateConfig({ provider, model })}
          onOpenCustomModal={() => {
            if (config) {
              // Guard: ensure the pre-selected provider is actually active.
              // If it's not, fall back to the first active provider.
              const providerActive =
                (config.provider === "gemini" && config.geminiActive) ||
                (config.provider === "vertex" && config.vertexActive) ||
                (config.provider === "openrouter" && config.openrouterActive) ||
                (config.provider === "local" && config.localActive) ||
                (config.provider === "9router" && config.nineRouterActive);
              const fallbackProvider = config.geminiActive
                ? "gemini"
                : config.vertexActive
                  ? "vertex"
                  : config.openrouterActive
                    ? "openrouter"
                    : config.localActive
                      ? "local"
                      : config.nineRouterActive
                        ? "9router"
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
                {config?.localActive && <option value="local">Local LLM</option>}
                {config?.nineRouterActive && <option value="9router">9router</option>}
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
                    : customProvider === "9router"
                      ? "Contoh: kr/claude-sonnet-4.5"
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
            <AlertDialogTitle>Hapus workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              Workspace{" "}
              <span className="canvas-agent-delete-dialog-title">
                {deleteTarget?.title ?? "Untitled workspace"}
              </span>{" "}
              akan dihapus permanen dari akun ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={workspaceAccess.isBusy}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={!deleteTarget || workspaceAccess.isBusy}
              onClick={(event) => {
                event.preventDefault();
                if (!deleteTarget) return;
                void handleDeleteWorkspace(deleteTarget.id);
              }}
            >
              {workspaceAccess.isBusy ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
