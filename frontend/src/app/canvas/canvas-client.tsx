"use client";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";

import { useHasMounted } from "@/hooks/use-has-mounted";

import "./canvas.css";

const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then((m) => m.Excalidraw),
  { ssr: false, loading: () => <CanvasLoader /> }
);

function CanvasLoader() {
  return (
    <div className="flex flex-1 items-center justify-center bg-background">
      <span className="animate-pulse font-mono text-[11px] tracking-[0.12em] uppercase text-muted-foreground">
        Loading canvas…
      </span>
    </div>
  );
}

export function CanvasClient() {
  const { resolvedTheme } = useTheme();
  const mounted = useHasMounted();

  if (!mounted) return <CanvasLoader />;

  const isDark = resolvedTheme === "dark";

  return (
    <div className="canvas-porto-wrapper flex-1 overflow-hidden">
      <Excalidraw
        theme={isDark ? "dark" : "light"}
        UIOptions={{
          canvasActions: {
            toggleTheme: false,
            changeViewBackgroundColor: false,
          },
          tools: { image: true },
        }}
        initialData={{
          appState: {
            viewBackgroundColor: "transparent",
            currentItemStrokeColor: isDark ? "#fafafa" : "#141414",
            currentItemBackgroundColor: "transparent",
            currentItemFillStyle: "solid",
            currentItemStrokeWidth: 1,
            currentItemRoughness: 0,
            currentItemOpacity: 100,
            currentItemFontFamily: 3,
            currentItemFontSize: 16,
            currentItemTextAlign: "left",
            currentItemStartArrowhead: null,
            currentItemEndArrowhead: "arrow",
          },
        }}
        langCode="id-ID"
      />
    </div>
  );
}
