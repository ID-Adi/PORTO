"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { RunRow } from "./canvas-agent-types";

export function CanvasAgentRunErrors({
  runs,
  busy,
  onRetry,
}: {
  runs: RunRow[];
  busy: boolean;
  onRetry: (run: RunRow) => void;
}) {
  if (runs.length === 0) return null;

  return (
    <div className="canvas-agent-run-errors">
      {runs.map((run) => (
        <div key={run.id} className="canvas-agent-run-error">
          <div>
            <span className="canvas-agent-section-kicker">agent failed</span>
            <p>{run.errorMessage ?? "Agent gagal memproses pesan."}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => onRetry(run)}
          >
            <Loader2 aria-hidden className={cn(busy && "animate-spin")} />
            Retry
          </Button>
        </div>
      ))}
    </div>
  );
}
