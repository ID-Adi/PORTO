"use client";

import { useEffect, useState } from "react";
import { FileImage, Image as ImageIcon, Video, Volume2 } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";

import { GenerateCard, type GenerateKind } from "./generate-card";
import { ImageConverterCard } from "./image-converter-card";
import { TtsCard } from "./tts-card";

type ToolTabKind = GenerateKind | "tts" | "image-converter";

const TABS: ReadonlyArray<{
  key: ToolTabKind;
  label: string;
  icon: typeof ImageIcon;
}> = [
  { key: "image", label: "Generate Image", icon: ImageIcon },
  { key: "video", label: "Generate Video", icon: Video },
  { key: "tts", label: "TTS", icon: Volume2 },
  { key: "image-converter", label: "PNG/JPG to WebP", icon: FileImage },
];

const STORAGE_KEY = "porto.tools.activeTab";

function isToolTabKind(value: string | null): value is ToolTabKind {
  return TABS.some((tab) => tab.key === value);
}

function readActiveTab(): ToolTabKind {
  if (typeof window === "undefined") return "image";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return isToolTabKind(raw) ? raw : "image";
  } catch {
    return "image";
  }
}

export function ToolsWorkshop() {
  const [active, setActive] = useState<ToolTabKind>("image");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActive(readActiveTab());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, active);
    } catch {
      // ignore quota errors
    }
  }, [active]);

  function onTabKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const currentIndex = TABS.findIndex((t) => t.key === active);
    const offset = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (currentIndex + offset + TABS.length) % TABS.length;
    setActive(TABS[nextIndex].key);
  }

  return (
    <div className="flex min-h-[calc(100dvh-10rem)] min-w-0 flex-col overflow-x-hidden">
      <div className="screen-line-bottom shrink-0 overflow-x-auto overflow-y-hidden overscroll-x-contain bg-(--background) md:overflow-x-hidden">
        <div
          role="tablist"
          aria-label="AI generators"
          onKeyDown={onTabKeyDown}
          className="flex min-w-max md:min-w-0 md:w-full"
        >
          {TABS.map(({ key, label, icon: Icon }) => {
            const isActive = active === key;
            return (
              <button
                key={key}
                id={`tools-tab-${key}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`tools-panel-${key}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActive(key)}
                className={cn(
                  "relative flex h-12 shrink-0 items-center justify-center gap-2 px-4 font-mono text-[11px] tracking-[0.18em] whitespace-nowrap uppercase md:flex-1 md:shrink",
                  "border-(--line) [&+button]:border-l",
                  isActive
                    ? "text-(--foreground)"
                    : "text-(--muted-foreground) hover:text-(--foreground)",
                )}
              >
                <Icon className="size-3.5 shrink-0" aria-hidden />
                <span className="whitespace-nowrap">{label}</span>
                {isActive ? (
                  <motion.span
                    layoutId="tools-tab-indicator"
                    aria-hidden
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 32,
                    }}
                    className="absolute inset-x-0 -bottom-px h-0.5 bg-(--foreground)"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <div
          key={active}
          id={`tools-panel-${active}`}
          role="tabpanel"
          aria-labelledby={`tools-tab-${active}`}
          className="h-full min-h-0"
        >
          {renderToolPanel(active)}
        </div>
      </div>
    </div>
  );
}

function renderToolPanel(key: ToolTabKind) {
  if (key === "tts") return <TtsCard />;
  if (key === "image-converter") return <ImageConverterCard />;
  return <GenerateCard kind={key} />;
}
