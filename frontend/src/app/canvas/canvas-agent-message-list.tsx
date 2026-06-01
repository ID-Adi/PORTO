"use client";

import { Bot, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";
import { formatTimestamp } from "./canvas-agent-utils";

import type { CanvasAgentMessage, FrameRef } from "./canvas-agent-types";

const remarkPlugins = [remarkGfm];

function MessageBubble({ message }: { message: CanvasAgentMessage }) {
  const frameRefs = (message.frameRefs ?? []) as FrameRef[];
  const isAssistant = message.role === "assistant";
  return (
    <div
      className={cn(
        "canvas-agent-message",
        message.role === "user" && "canvas-agent-message-user",
      )}
    >
      <div className="canvas-agent-message-kicker">
        <span>{message.role}</span>
        <span>{formatTimestamp(message.createdAt)}</span>
      </div>
      {isAssistant ? (
        <div className="canvas-agent-markdown">
          <ReactMarkdown remarkPlugins={remarkPlugins}>
            {message.content}
          </ReactMarkdown>
        </div>
      ) : (
        <p>{message.content}</p>
      )}
      {frameRefs.length > 0 ? (
        <div className="canvas-agent-frame-chips">
          {frameRefs.map((frame) => (
            <span key={frame.id}>{frame.mention}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function CanvasAgentMessageList({
  messages,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  onLoadMore,
  activeRunCount,
  hasLiveActivity,
}: {
  messages: CanvasAgentMessage[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  onLoadMore: () => void;
  activeRunCount: number;
  hasLiveActivity: boolean;
}) {
  return (
    <>
      {hasNextPage ? (
        <button
          type="button"
          className="canvas-agent-load-more"
          disabled={isFetchingNextPage}
          onClick={onLoadMore}
        >
          {isFetchingNextPage ? (
            <Loader2 aria-hidden className="size-3.5 animate-spin" />
          ) : null}
          Load older
        </button>
      ) : null}

      {isLoading ? (
        <div className="canvas-agent-loading">
          <Loader2 aria-hidden className="size-3.5 animate-spin" />
          Memuat chat
        </div>
      ) : null}

      {!isLoading && messages.length === 0 && !hasLiveActivity ? (
        <div className="canvas-agent-placeholder">
          <Bot aria-hidden className="size-4" />
          <p>Mulai chat, atau mention @nama_frame untuk mengikat Agent ke frame.</p>
        </div>
      ) : null}

      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}

      {activeRunCount > 0 ? (
        <div className="canvas-agent-loading">
          <Loader2 aria-hidden className="size-3.5 animate-spin" />
          Agent thinking...
        </div>
      ) : null}
    </>
  );
}
