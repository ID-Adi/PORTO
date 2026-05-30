"use client";

import { DefaultSidebar, Sidebar } from "@excalidraw/excalidraw";
import { Bot, Video } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { CanvasAgentPanel } from "./canvas-agent-panel";
import { CanvasSidebarResizeHandle } from "./canvas-sidebar-resize-handle";
import { CanvasVideoSidebar } from "./canvas-video-sidebar";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { RefObject } from "react";

const LAST_SIDEBAR_TAB_KEY = "porto:canvas:default-sidebar-tab:v1";

type CanvasExtraSidebarProps = {
  videoUrl: string | null;
  apiRef: RefObject<ExcalidrawImperativeAPI | null>;
  isAuthed: boolean;
};

function readLastSidebarTab() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(LAST_SIDEBAR_TAB_KEY);
  } catch {
    return null;
  }
}

function writeLastSidebarTab(tab: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAST_SIDEBAR_TAB_KEY, tab);
  } catch {
    // localStorage can fail in private mode; keep sidebar behavior usable.
  }
}

export function CanvasExtraSidebar({
  videoUrl,
  apiRef,
  isAuthed,
}: CanvasExtraSidebarProps) {
  const [agentEnabled, setAgentEnabled] = useState(false);
  const sidebarOpenRef = useRef(false);
  const restoringRef = useRef(false);

  const handleSidebarStateChange = useCallback(
    (state: { name: string; tab?: string } | null) => {
      if (!state) {
        sidebarOpenRef.current = false;
        restoringRef.current = false;
        return;
      }

      const tab = state.tab;
      if (!tab) return;

      if (tab === "agent") {
        setAgentEnabled(true);
      }

      const wasOpen = sidebarOpenRef.current;
      sidebarOpenRef.current = true;

      if (restoringRef.current) {
        const storedTab = readLastSidebarTab();
        if (!storedTab || storedTab === tab) {
          restoringRef.current = false;
          writeLastSidebarTab(tab);
        }
        return;
      }

      const isExplicitVideoOpen = !wasOpen && tab === "video" && Boolean(videoUrl);
      if (!wasOpen && !isExplicitVideoOpen) {
        const storedTab = readLastSidebarTab();
        if (storedTab && storedTab !== tab) {
          restoringRef.current = true;
          if (storedTab === "agent") {
            setAgentEnabled(true);
          }
          window.requestAnimationFrame(() => {
            apiRef.current?.toggleSidebar({
              name: "default",
              tab: storedTab,
              force: true,
            });
          });
          return;
        }
      }

      writeLastSidebarTab(tab);
    },
    [apiRef, videoUrl],
  );

  return (
    <DefaultSidebar onStateChange={handleSidebarStateChange}>
      <CanvasSidebarResizeHandle />
      <DefaultSidebar.TabTriggers>
        <Sidebar.TabTrigger
          tab="video"
          title="Video"
          aria-label="Video"
        >
          <Video aria-hidden className="size-4" />
        </Sidebar.TabTrigger>
        <Sidebar.TabTrigger
          tab="agent"
          title="Agent"
          aria-label="Agent"
          onSelect={() => setAgentEnabled(true)}
        >
          <Bot aria-hidden className="size-4" />
        </Sidebar.TabTrigger>
      </DefaultSidebar.TabTriggers>
      <Sidebar.Tab tab="video">
        <CanvasVideoSidebar videoUrl={videoUrl} />
      </Sidebar.Tab>
      <Sidebar.Tab tab="agent" className="canvas-agent-tab">
        <CanvasAgentPanel
          apiRef={apiRef}
          isAuthed={isAuthed}
          enabled={agentEnabled}
        />
      </Sidebar.Tab>
    </DefaultSidebar>
  );
}
