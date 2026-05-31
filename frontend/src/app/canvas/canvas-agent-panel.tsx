"use client";

import { Bot, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
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
  useCanvasAgentWorkflows,
} from "./canvas-agent-hooks";
import { CanvasAgentMessageList } from "./canvas-agent-message-list";
import { CanvasAgentProposalList } from "./canvas-agent-proposal-list";
import { CanvasAgentRunErrors } from "./canvas-agent-run-errors";
import { useCanvasWorkflow } from "./canvas-workflow-context";
import { formatTimestamp } from "./canvas-agent-utils";

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
  const [input, setInput] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WorkflowRow | null>(null);

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
      setInput(content);
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
              onRenameWorkflow={handleRenameWorkflow}
              onTogglePin={handleTogglePin}
              onDeleteWorkflow={setDeleteTarget}
            />
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
          <CanvasAgentMessageList
            messages={chat.messages}
            isLoading={chat.messagesQuery.isLoading && activeWorkflowId !== null}
            isFetchingNextPage={chat.messagesQuery.isFetchingNextPage}
            hasNextPage={Boolean(chat.messagesQuery.hasNextPage)}
            onLoadMore={() => {
              void chat.messagesQuery.fetchNextPage();
            }}
            activeRunCount={chat.activeRuns.length}
          />
          <CanvasAgentRunErrors
            runs={chat.failedRuns}
            busy={chat.isBusy}
            onRetry={(run) => {
              void chat.retryRun(run).catch((error) => {
                toast.error(
                  error instanceof Error ? error.message : "Gagal retry agent",
                );
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
        />
      </div>

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
