"use client";

import { Loader2, Send, Square, Cpu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const presetModels = {
  gemini: [
    "gemini-3.1-flash",
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
  ],
  vertex: [
    "gemini-3-flash-preview", // Gemini 3 Flash (Preview)
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-3.5-flash",
  ],
  openrouter: [
    "x-ai/grok-4.1-fast", // Grok 4.1 Fast
    "x-ai/grok-4.20", // Grok 4.20
    "google/gemini-2.5-flash",
    "google/gemini-2.5-pro",
    "anthropic/claude-3.5-sonnet",
    "meta-llama/llama-3.3-70b-instruct",
    "deepseek/deepseek-chat",
  ],
  // 9router: route/model mengikuti dashboard. Beberapa contoh umum; model lain
  // bisa lewat "CUSTOM MODEL...".
  "9router": [
    "kr/claude-sonnet-4.5",
    "fe_oa_/gpt-5.5",
  ],
};

type ProviderKey = keyof typeof presetModels;

function isProviderKey(value: unknown): value is ProviderKey {
  return (
    value === "gemini" ||
    value === "vertex" ||
    value === "openrouter" ||
    value === "9router"
  );
}

type SelectableProvider =
  | "gemini"
  | "vertex"
  | "openrouter"
  | "local"
  | "9router";

export function CanvasAgentComposer({
  input,
  onInputChange,
  onSubmit,
  onStop,
  isSending,
  streamState,
  activeProvider,
  activeModel,
  config,
  localModels = [],
  localModelsLoading = false,
  onModelMenuOpenChange,
  onSelectModel,
  onOpenCustomModal,
}: {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  isSending: boolean;
  streamState: "idle" | "thinking" | "streaming" | "saving" | "failed";
  activeProvider?: string;
  activeModel?: string;
  config: any;
  localModels?: { id: string; name?: string }[];
  localModelsLoading?: boolean;
  onModelMenuOpenChange?: (open: boolean) => void;
  onSelectModel: (provider: SelectableProvider, model: string) => void;
  onOpenCustomModal: () => void;
}) {
  const statusText =
    streamState === "idle"
      ? null
      : streamState === "failed"
        ? "failed"
        : streamState;
  const activeProviderKey = isProviderKey(activeProvider)
    ? activeProvider
    : null;
  const activeIsPreset = Boolean(
    activeProviderKey &&
      activeModel &&
      presetModels[activeProviderKey].includes(activeModel),
  );
  const customActive = Boolean(activeProviderKey && activeModel && !activeIsPreset);
  const isActiveModel = (provider: ProviderKey, model: string) =>
    activeProvider === provider && activeModel === model;

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
      {activeModel && (
        <div className="col-span-2 flex items-center justify-between border-b border-line pb-2 mb-2 font-mono text-[9px] text-muted-foreground uppercase tracking-widest">
          <span>[ AGENT MODEL: {activeProvider}{" // "}{activeModel} ]</span>
        </div>
      )}

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

      <div className="flex flex-col gap-1.5 justify-start">
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

        <DropdownMenu onOpenChange={onModelMenuOpenChange}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              aria-label="Pilih model"
              title="Pilih model"
            >
              <Cpu className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 font-mono text-[11px] rounded-none bg-popover border border-line p-1 shadow-none text-popover-foreground"
          >
            {config?.geminiActive && (
              <DropdownMenuGroup>
                <DropdownMenuLabel className="px-2 py-1 text-[9px] text-muted-foreground tracking-widest">GEMINI</DropdownMenuLabel>
                {presetModels.gemini.map((m) => (
                  <DropdownMenuItem
                    key={m}
                    onClick={() => onSelectModel("gemini", m)}
                    className="flex items-center justify-between px-2 py-1 cursor-pointer hover:bg-muted focus:bg-muted outline-none rounded-none"
                  >
                    <span>{m}</span>
                    {isActiveModel("gemini", m) && <span className="text-[10px]">✓</span>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            )}
            {config?.vertexActive && (
              <>
                <DropdownMenuSeparator className="h-px bg-line my-1" />
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="px-2 py-1 text-[9px] text-muted-foreground tracking-widest">VERTEX AI</DropdownMenuLabel>
                  {presetModels.vertex.map((m) => (
                    <DropdownMenuItem
                      key={m}
                      onClick={() => onSelectModel("vertex", m)}
                      className="flex items-center justify-between px-2 py-1 cursor-pointer hover:bg-muted focus:bg-muted outline-none rounded-none"
                    >
                      <span>{m === "gemini-3-flash-preview" ? "Gemini 3 Flash (Prev)" : m}</span>
                      {isActiveModel("vertex", m) && <span className="text-[10px]">✓</span>}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </>
            )}
            {config?.openrouterActive && (
              <>
                <DropdownMenuSeparator className="h-px bg-line my-1" />
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="px-2 py-1 text-[9px] text-muted-foreground tracking-widest">OPENROUTER</DropdownMenuLabel>
                  {presetModels.openrouter.map((m) => (
                    <DropdownMenuItem
                      key={m}
                      onClick={() => onSelectModel("openrouter", m)}
                      className="flex items-center justify-between px-2 py-1 cursor-pointer hover:bg-muted focus:bg-muted outline-none rounded-none"
                    >
                      <span>
                        {m.replace("x-ai/", "").replace("google/", "").replace("anthropic/", "").replace("meta-llama/", "").replace("deepseek/", "")}
                      </span>
                      {isActiveModel("openrouter", m) && <span className="text-[10px]">✓</span>}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </>
            )}
            {config?.localActive && (
              <>
                <DropdownMenuSeparator className="h-px bg-line my-1" />
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="px-2 py-1 text-[9px] text-muted-foreground tracking-widest">
                    LOCAL (TAILSCALE)
                  </DropdownMenuLabel>
                  {localModelsLoading ? (
                    <DropdownMenuItem
                      disabled
                      className="px-2 py-1 text-muted-foreground rounded-none"
                    >
                      Mendeteksi model…
                    </DropdownMenuItem>
                  ) : localModels.length === 0 ? (
                    <DropdownMenuItem
                      disabled
                      className="px-2 py-1 text-muted-foreground rounded-none"
                    >
                      Tidak ada model / server offline
                    </DropdownMenuItem>
                  ) : (
                    localModels.map((m) => (
                      <DropdownMenuItem
                        key={m.id}
                        onClick={() => onSelectModel("local", m.id)}
                        className="flex items-center justify-between px-2 py-1 cursor-pointer hover:bg-muted focus:bg-muted outline-none rounded-none"
                      >
                        <span>{m.name ?? m.id}</span>
                        {activeProvider === "local" && activeModel === m.id && (
                          <span className="text-[10px]">✓</span>
                        )}
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuGroup>
              </>
            )}
            {config?.nineRouterActive && (
              <>
                <DropdownMenuSeparator className="h-px bg-line my-1" />
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="px-2 py-1 text-[9px] text-muted-foreground tracking-widest">
                    9ROUTER
                  </DropdownMenuLabel>
                  {presetModels["9router"].map((m) => (
                    <DropdownMenuItem
                      key={m}
                      onClick={() => onSelectModel("9router", m)}
                      className="flex items-center justify-between px-2 py-1 cursor-pointer hover:bg-muted focus:bg-muted outline-none rounded-none"
                    >
                      <span>{m}</span>
                      {isActiveModel("9router", m) && (
                        <span className="text-[10px]">✓</span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </>
            )}
            <DropdownMenuSeparator className="h-px bg-line my-1" />
            <DropdownMenuItem
              onClick={onOpenCustomModal}
              className="flex items-center justify-between px-2 py-1.5 cursor-pointer text-primary font-bold hover:bg-muted focus:bg-muted outline-none rounded-none text-[10px]"
            >
              <span>
                {customActive ? `CUSTOM: ${activeModel}` : "CUSTOM MODEL..."}
              </span>
              {customActive && <span className="text-[10px]">✓</span>}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </form>
  );
}
