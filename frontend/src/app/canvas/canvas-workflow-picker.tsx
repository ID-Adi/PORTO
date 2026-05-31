"use client";

import { Check, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { useCanvasAgentWorkflows } from "./canvas-agent-hooks";
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
  const workflowAccess = useCanvasAgentWorkflows({
    enabled: open && isAuthed,
    activeWorkflowId,
    switchWorkflow,
  });
  const workflows = workflowAccess.workflows;

  function handleSelect(id: number) {
    if (id === activeWorkflowId) {
      onOpenChange(false);
      return;
    }
    // Tutup modal seketika; pindah workflow jalan di background agar user
    // tidak tertahan menunggu save+load scene.
    onOpenChange(false);
    void switchWorkflow(id).catch((error) => {
      toast.error(
        error instanceof Error ? error.message : "Gagal memuat workflow"
      );
    });
  }

  function handleCreate() {
    onOpenChange(false);
    void workflowAccess.createWorkflow("Untitled workflow").catch((error) => {
      toast.error(
        error instanceof Error ? error.message : "Gagal membuat workflow"
      );
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          ) : workflowAccess.workflowsQuery.isLoading ? (
            <div className="flex flex-1 items-center justify-center gap-2 font-mono text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Memuat workflow…
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handleCreate}
                className="flex items-center justify-center gap-2 border border-dashed border-line py-3 font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase transition-colors hover:border-foreground hover:text-foreground"
              >
                <Plus className="size-3.5" aria-hidden />
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
                    return (
                      <button
                        key={wf.id}
                        type="button"
                        onClick={() => handleSelect(wf.id)}
                        className={cn(
                          "flex items-center justify-between gap-3 border border-line p-3 text-left transition-colors hover:border-foreground",
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
                        {isActive ? (
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
