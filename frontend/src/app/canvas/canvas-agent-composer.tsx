"use client";

import { Loader2, Send, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function CanvasAgentComposer({
  input,
  onInputChange,
  onSubmit,
  onStop,
  isSending,
  streamState,
}: {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  isSending: boolean;
  streamState: "idle" | "thinking" | "streaming" | "saving" | "failed";
}) {
  const statusText =
    streamState === "idle"
      ? null
      : streamState === "failed"
        ? "failed"
        : streamState;

  return (
    <form
      className="canvas-agent-composer"
      onWheelCapture={(event) => {
        event.stopPropagation();
      }}
      onTouchMoveCapture={(event) => {
        event.stopPropagation();
      }}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div
        className="canvas-agent-composer-input"
        data-status={statusText ?? undefined}
        onWheelCapture={(event) => {
          event.stopPropagation();
        }}
        onTouchMoveCapture={(event) => {
          event.stopPropagation();
        }}
      >
        <Textarea
          value={input}
          disabled={streamState === "thinking"}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              onSubmit();
            }
          }}
          placeholder="Chat Agent. Contoh: bantu rapikan @frame_1"
        />
        {statusText ? <span>{statusText}</span> : null}
      </div>
      {isSending ? (
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          aria-label="Stop stream"
          title="Stop stream"
          onClick={onStop}
        >
          <Square aria-hidden />
        </Button>
      ) : (
        <Button
          type="submit"
          variant="outline"
          size="icon-lg"
          aria-label="Kirim chat"
          title="Kirim chat"
          disabled={!input.trim()}
        >
          {streamState === "thinking" ? (
            <Loader2 aria-hidden className="animate-spin" />
          ) : (
            <Send aria-hidden />
          )}
        </Button>
      )}
    </form>
  );
}
