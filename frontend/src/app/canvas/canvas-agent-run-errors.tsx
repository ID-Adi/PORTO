"use client";

import { Loader2, RefreshCw, X } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { RunRow } from "./canvas-agent-types";

export function CanvasAgentRunErrors({
  runs,
  retryingRunIds,
  onRetry,
  onDismiss,
}: {
  runs: RunRow[];
  retryingRunIds: Set<number>;
  onRetry: (run: RunRow) => void;
  onDismiss: (run: RunRow) => void;
}) {
  if (runs.length === 0) return null;

  return (
    <div className="canvas-agent-run-errors">
      {runs.map((run) => {
        const busy = retryingRunIds.has(run.id);
        return (
          <div key={run.id} className="canvas-agent-run-error">
          <div>
            <span className="canvas-agent-section-kicker">agent failed</span>
            <p>{run.errorMessage ?? "Agent gagal memproses pesan."}</p>
          </div>
          <div className="canvas-agent-run-error-actions">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => onRetry(run)}
            >
              {busy ? (
                <Loader2 aria-hidden className="animate-spin" />
              ) : (
                <RefreshCw aria-hidden />
              )}
              Retry
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Tutup error"
              title="Tutup"
              onClick={() => onDismiss(run)}
            >
              <X aria-hidden />
            </Button>
          </div>
          </div>
        );
      })}
    </div>
  );
}
