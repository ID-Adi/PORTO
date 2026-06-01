"use client";

import { History, Pin, PinOff, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import { formatTimestamp } from "./canvas-agent-utils";

import type { WorkflowRow } from "./canvas-agent-types";

export function CanvasAgentHistoryMenu({
  open,
  onOpenChange,
  workspaces,
  activeWorkspaceId,
  activeWorkspaceTitle,
  busy,
  onSwitchWorkspace,
  onPrefetchWorkspace,
  onRenameWorkspace,
  onTogglePin,
  onDeleteWorkspace,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaces: WorkflowRow[];
  activeWorkspaceId: number | null;
  activeWorkspaceTitle: string;
  busy: boolean;
  onSwitchWorkspace: (id: number) => void;
  onPrefetchWorkspace: (id: number) => void;
  onRenameWorkspace: (workspace: WorkflowRow, nextTitle: string) => void;
  onTogglePin: (workspace: WorkflowRow) => void;
  onDeleteWorkspace: (workspace: WorkflowRow) => void;
}) {
  return (
    <DropdownMenu modal={false} open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Workspace history"
          title="Workspace history"
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
          <DropdownMenuLabel>Workspace history</DropdownMenuLabel>
          <div className="canvas-agent-history-current">
            <span>Active</span>
            <strong title={activeWorkspaceTitle}>{activeWorkspaceTitle}</strong>
          </div>
          <DropdownMenuSeparator />
        </div>
        <DropdownMenuGroup>
          {workspaces.length === 0 ? (
            <DropdownMenuItem disabled>Belum ada workspace</DropdownMenuItem>
          ) : (
            workspaces.map((workspace) => (
              <div
                key={workspace.id}
                role="button"
                tabIndex={0}
                className={cn(
                  "canvas-agent-history-item",
                  workspace.id === activeWorkspaceId &&
                    "canvas-agent-history-item-active",
                )}
                onPointerEnter={() => {
                  onPrefetchWorkspace(workspace.id);
                }}
                onFocus={() => {
                  onPrefetchWorkspace(workspace.id);
                }}
                onClick={(event) => {
                  event.stopPropagation();
                }}
                onDoubleClick={(event) => {
                  event.stopPropagation();
                  onSwitchWorkspace(workspace.id);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    event.stopPropagation();
                    onSwitchWorkspace(workspace.id);
                  }
                }}
              >
                <div className="canvas-agent-history-copy">
                  <Input
                    key={workspace.id}
                    defaultValue={workspace.title}
                    aria-label={`Rename workspace ${workspace.title}`}
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                    onFocus={(event) => {
                      event.stopPropagation();
                    }}
                    onBlur={(event) => {
                      onRenameWorkspace(workspace, event.currentTarget.value);
                    }}
                    onKeyDown={(event) => {
                      event.stopPropagation();
                      if (event.key === "Enter") {
                        event.currentTarget.blur();
                      }
                    }}
                  />
                  <small>
                    {workspace.id === activeWorkspaceId ? "active / " : ""}
                    {workspace.isPinned ? "pinned / " : ""}
                    {workspace.status === "archived"
                      ? "archived"
                      : formatTimestamp(workspace.updatedAt)}
                  </small>
                </div>
                <div className="canvas-agent-history-actions">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="canvas-agent-history-pin-button"
                    data-pinned={workspace.isPinned ? "true" : undefined}
                    disabled={busy}
                    aria-label={
                      workspace.isPinned ? "Unpin workspace" : "Pin workspace"
                    }
                    title={workspace.isPinned ? "Unpin workspace" : "Pin workspace"}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                    }}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onTogglePin(workspace);
                    }}
                    onDoubleClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                  >
                    {workspace.isPinned ? (
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
                    aria-label="Delete workspace"
                    title="Delete workspace"
                    onPointerDown={(event) => {
                      event.stopPropagation();
                    }}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onDeleteWorkspace(workspace);
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
  );
}
