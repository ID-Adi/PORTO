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
  workflows,
  activeWorkflowId,
  activeWorkflowTitle,
  busy,
  onSwitchWorkflow,
  onRenameWorkflow,
  onTogglePin,
  onDeleteWorkflow,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflows: WorkflowRow[];
  activeWorkflowId: number | null;
  activeWorkflowTitle: string;
  busy: boolean;
  onSwitchWorkflow: (id: number) => void;
  onRenameWorkflow: (workflow: WorkflowRow, nextTitle: string) => void;
  onTogglePin: (workflow: WorkflowRow) => void;
  onDeleteWorkflow: (workflow: WorkflowRow) => void;
}) {
  return (
    <DropdownMenu modal={false} open={open} onOpenChange={onOpenChange}>
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
                  onSwitchWorkflow(workflow.id);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    event.stopPropagation();
                    onSwitchWorkflow(workflow.id);
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
                      onRenameWorkflow(workflow, event.currentTarget.value);
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
                      workflow.isPinned ? "Unpin workflow" : "Pin workflow"
                    }
                    title={workflow.isPinned ? "Unpin workflow" : "Pin workflow"}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                    }}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onTogglePin(workflow);
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
                      onDeleteWorkflow(workflow);
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
