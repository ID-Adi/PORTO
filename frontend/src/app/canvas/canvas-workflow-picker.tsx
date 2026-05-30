"use client";

import { Check, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

import { useCanvasWorkflow } from "./canvas-workflow-context";

type CanvasWorkflowPickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAuthed: boolean;
};

function formatDate(value: unknown) {
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function CanvasWorkflowPicker({
  open,
  onOpenChange,
  isAuthed,
}: CanvasWorkflowPickerProps) {
  const { activeWorkflowId, switchWorkflow } = useCanvasWorkflow();
  const utils = trpc.useUtils();
  const [pendingId, setPendingId] = useState<number | "new" | null>(null);

  const workflowsQuery = trpc.canvasAgent.listWorkflows.useQuery(undefined, {
    enabled: open && isAuthed,
    staleTime: 30_000,
  });
  const createWorkflow = trpc.canvasAgent.createWorkflow.useMutation();

  const workflows = workflowsQuery.data ?? [];

  async function handleSelect(id: number) {
    if (pendingId !== null) return;
    setPendingId(id);
    try {
      await switchWorkflow(id);
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal memuat workflow"
      );
    } finally {
      setPendingId(null);
    }
  }

  async function handleCreate() {
    if (pendingId !== null) return;
    setPendingId("new");
    try {
      const row = await createWorkflow.mutateAsync({ title: "Untitled workflow" });
      await utils.canvasAgent.listWorkflows.invalidate();
      await switchWorkflow(row.id);
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal membuat workflow"
      );
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && pendingId !== null) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-lg rounded-none border border-line bg-background">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm tracking-[0.12em] uppercase">
            Muat workflow canvas
          </DialogTitle>
        </DialogHeader>

        <div className="flex max-h-[60vh] min-h-[30vh] flex-col gap-3 overflow-y-auto p-1">
          {!isAuthed ? (
            <p className="flex flex-1 items-center justify-center px-4 text-center font-mono text-xs text-muted-foreground">
              Login dulu untuk memuat workflow.
            </p>
          ) : workflowsQuery.isLoading ? (
            <div className="flex flex-1 items-center justify-center gap-2 font-mono text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Memuat workflow…
            </div>
          ) : (
            <>
              <button
                type="button"
                disabled={pendingId !== null}
                onClick={handleCreate}
                className="flex items-center justify-center gap-2 border border-dashed border-line py-3 font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase transition-colors hover:border-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
              >
                {pendingId === "new" ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <Plus className="size-3.5" aria-hidden />
                )}
                Workflow baru (kanvas kosong)
              </button>

              {workflows.length === 0 ? (
                <p className="flex flex-1 items-center justify-center px-4 text-center font-mono text-xs text-muted-foreground">
                  Belum ada workflow. Simpan kanvas dulu atau buat baru.
                </p>
              ) : (
                <div className="grid gap-2">
                  {workflows.map((wf) => {
                    const isActive = wf.id === activeWorkflowId;
                    const isPending = pendingId === wf.id;
                    return (
                      <button
                        key={wf.id}
                        type="button"
                        disabled={pendingId !== null}
                        onClick={() => handleSelect(wf.id)}
                        className={cn(
                          "flex items-center justify-between gap-3 border border-line p-3 text-left transition-colors hover:border-foreground disabled:cursor-not-allowed disabled:opacity-60",
                          isActive && "bg-muted/40"
                        )}
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {wf.title || "Untitled workflow"}
                          </div>
                          <div className="mt-1 font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
                            {formatDate(wf.updatedAt)}
                            {wf.isPinned ? " · pinned" : ""}
                          </div>
                        </div>
                        {isPending ? (
                          <Loader2
                            className="size-4 shrink-0 animate-spin text-muted-foreground"
                            aria-hidden
                          />
                        ) : isActive ? (
                          <Check
                            className="size-4 shrink-0 text-foreground"
                            aria-hidden
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
