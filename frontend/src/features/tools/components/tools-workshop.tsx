"use client";

import { useEffect, useState } from "react";
import { Image as ImageIcon, Video } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";

import { GenerateCard, type GenerateKind } from "./generate-card";

const TABS: ReadonlyArray<{
  key: GenerateKind;
  label: string;
  icon: typeof ImageIcon;
}> = [
  { key: "image", label: "Generate Image", icon: ImageIcon },
  { key: "video", label: "Generate Video", icon: Video },
];

const STORAGE_KEY = "porto.tools.activeTab";

function readActiveTab(): GenerateKind {
  if (typeof window === "undefined") return "image";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === "video" ? "video" : "image";
  } catch {
    return "image";
  }
}

export function ToolsWorkshop() {
  const [active, setActive] = useState<GenerateKind>("image");

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
    <>
      <div
        role="tablist"
        aria-label="AI generators"
        onKeyDown={onTabKeyDown}
        className="screen-line-bottom grid grid-cols-2 border-b border-(--line)"
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
                "relative flex h-12 items-center justify-center gap-2 px-4 font-mono text-[11px] tracking-[0.18em] uppercase transition-colors",
                "border-(--line) [&+button]:border-l",
                isActive
                  ? "text-(--foreground)"
                  : "text-(--muted-foreground) hover:text-(--foreground)",
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              <span>{label}</span>
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

      {/*
        Kedua panel tetap dirender (tidak di-unmount) supaya state internal
        GenerateCard (prompt, status generating, timer) terjaga saat berpindah
        tab. Atribut `hidden` adalah cara paling cepat untuk menyembunyikan
        DOM tanpa biaya re-render & memutuskan layout (tidak ada animasi
        keluar/masuk yang berat).
      */}
      {TABS.map(({ key }) => (
        <div
          key={key}
          id={`tools-panel-${key}`}
          role="tabpanel"
          aria-labelledby={`tools-tab-${key}`}
          hidden={active !== key}
        >
          <GenerateCard kind={key} />
        </div>
      ))}
    </>
  );
}
