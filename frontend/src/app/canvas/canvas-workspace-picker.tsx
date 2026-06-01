"use client";

import { Check, Loader2, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { useCanvasAgentWorkspaces } from "./canvas-agent-hooks";
import { useCanvasWorkspace } from "./canvas-workspace-context";
import { prefetchWorkspaceBundle } from "./canvas-workspace-prefetch";

type CanvasWorkspacePickerProps = {
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

export function CanvasWorkspacePicker({
  open,
  onOpenChange,
  isAuthed,
}: CanvasWorkspacePickerProps) {
  const { activeWorkspaceId, switchWorkspace } = useCanvasWorkspace();
  const queryClient = useQueryClient();
  const workspaceAccess = useCanvasAgentWorkspaces({
    enabled: open && isAuthed,
    activeWorkspaceId,
    switchWorkspace,
  });
  const workspaces = workspaceAccess.workspaces;

  // Prefetch bundle saat user hover workspace — data sudah siap saat diklik.
  function handlePrefetch(id: number) {
    void prefetchWorkspaceBundle(queryClient, id);
  }

  function handleSelect(id: number) {
    if (id === activeWorkspaceId) {
      onOpenChange(false);
      return;
    }
    // Tutup modal seketika; pindah workspace jalan di background agar user
    // tidak tertahan menunggu save+load scene.
    onOpenChange(false);
    void prefetchWorkspaceBundle(queryClient, id);
    void switchWorkspace(id).catch((error) => {
      toast.error(
        error instanceof Error ? error.message : "Gagal memuat workspace",
      );
    });
  }

  function handleCreate() {
    onOpenChange(false);
    void workspaceAccess.createWorkspace("Untitled workspace").catch((error) => {
      toast.error(
        error instanceof Error ? error.message : "Gagal membuat workspace",
      );
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-none border border-line bg-background">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm tracking-[0.12em] uppercase">
            Muat workspace canvas
          </DialogTitle>
        </DialogHeader>

        <div className="flex max-h-[60vh] min-h-[30vh] flex-col gap-3 overflow-y-auto p-1">
          {!isAuthed ? (
            <p className="flex flex-1 items-center justify-center px-4 text-center font-mono text-xs text-muted-foreground">
              Login dulu untuk memuat workspace.
            </p>
          ) : workspaceAccess.workspacesQuery.isLoading ? (
            <div className="flex flex-1 items-center justify-center gap-2 font-mono text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Memuat workspace…
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handleCreate}
                className="flex items-center justify-center gap-2 border border-dashed border-line py-3 font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase transition-colors hover:border-foreground hover:text-foreground"
              >
                <Plus className="size-3.5" aria-hidden />
                Workspace baru (kanvas kosong)
              </button>

              {workspaces.length === 0 ? (
                <p className="flex flex-1 items-center justify-center px-4 text-center font-mono text-xs text-muted-foreground">
                  Belum ada workspace. Simpan kanvas dulu atau buat baru.
                </p>
              ) : (
                <div className="grid gap-2">
                  {workspaces.map((wf) => {
                    const isActive = wf.id === activeWorkspaceId;
                    return (
                      <button
                        key={wf.id}
                        type="button"
                        onClick={() => handleSelect(wf.id)}
                        onPointerEnter={() => handlePrefetch(wf.id)}
                        className={cn(
                          "flex items-center justify-between gap-3 border border-line p-3 text-left transition-colors hover:border-foreground",
                          isActive && "bg-muted/40"
                        )}
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {wf.title || "Untitled workspace"}
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
