"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "porto:canvas:right-sidebar-width:v1";
const DEFAULT_WIDTH = 420;
const MIN_WIDTH = 320;
const MAX_WIDTH = 720;
const KEYBOARD_STEP = 24;

function getMaxWidth() {
  if (typeof window === "undefined") return MAX_WIDTH;
  return Math.min(MAX_WIDTH, Math.floor(window.innerWidth * 0.7));
}

function clampWidth(width: number) {
  return Math.max(MIN_WIDTH, Math.min(getMaxWidth(), Math.round(width)));
}

function readStoredWidth() {
  if (typeof window === "undefined") return DEFAULT_WIDTH;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return DEFAULT_WIDTH;
  const parsed = Number.parseInt(stored, 10);
  return Number.isFinite(parsed) ? clampWidth(parsed) : DEFAULT_WIDTH;
}

function getScope(element: HTMLElement | null) {
  return element?.closest<HTMLElement>(".excalidraw") ?? null;
}

export function CanvasSidebarResizeHandle() {
  const handleRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const [width, setWidth] = useState(() => readStoredWidth());

  const setCssWidth = useCallback((nextWidth: number) => {
    getScope(handleRef.current)?.style.setProperty(
      "--right-sidebar-width",
      `${nextWidth}px`,
    );
  }, []);

  const applyWidth = useCallback((nextWidth: number, persist = false) => {
    const clamped = clampWidth(nextWidth);
    setWidth(clamped);
    setCssWidth(clamped);
    if (persist) {
      window.localStorage.setItem(STORAGE_KEY, String(clamped));
    }
    return clamped;
  }, [setCssWidth]);

  useEffect(() => {
    setCssWidth(width);
  }, [setCssWidth, width]);

  useEffect(() => {
    const handleResize = () => applyWidth(width, true);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [applyWidth, width]);

  function widthFromPointer(event: Pick<PointerEvent, "clientX">) {
    return window.innerWidth - event.clientX;
  }

  return (
    <div
      ref={handleRef}
      role="separator"
      aria-label="Ubah lebar sidebar"
      aria-orientation="vertical"
      aria-valuemin={MIN_WIDTH}
      aria-valuemax={getMaxWidth()}
      aria-valuenow={width}
      tabIndex={0}
      className="canvas-sidebar-resize-handle"
      onPointerDown={(event) => {
        draggingRef.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        applyWidth(widthFromPointer(event.nativeEvent));
      }}
      onPointerMove={(event) => {
        if (!draggingRef.current) return;
        applyWidth(widthFromPointer(event.nativeEvent));
      }}
      onPointerUp={(event) => {
        if (!draggingRef.current) return;
        draggingRef.current = false;
        event.currentTarget.releasePointerCapture(event.pointerId);
        applyWidth(widthFromPointer(event.nativeEvent), true);
      }}
      onPointerCancel={(event) => {
        draggingRef.current = false;
        event.currentTarget.releasePointerCapture(event.pointerId);
        applyWidth(width, true);
      }}
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        const direction = event.key === "ArrowLeft" ? 1 : -1;
        applyWidth(width + direction * KEYBOARD_STEP, true);
      }}
    >
      <span aria-hidden className="canvas-sidebar-resize-handle-line" />
    </div>
  );
}
