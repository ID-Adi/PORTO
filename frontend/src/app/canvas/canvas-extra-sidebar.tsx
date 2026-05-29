"use client";

import { DefaultSidebar, Sidebar } from "@excalidraw/excalidraw";
import { Video } from "lucide-react";

import { CanvasVideoSidebar } from "./canvas-video-sidebar";

type CanvasExtraSidebarProps = {
  videoUrl: string | null;
};

export function CanvasExtraSidebar({ videoUrl }: CanvasExtraSidebarProps) {
  return (
    <DefaultSidebar>
      <DefaultSidebar.TabTriggers>
        <Sidebar.TabTrigger
          tab="video"
          title="Video"
          aria-label="Video"
        >
          <Video aria-hidden className="size-4" />
        </Sidebar.TabTrigger>
      </DefaultSidebar.TabTriggers>
      <Sidebar.Tab tab="video">
        <CanvasVideoSidebar videoUrl={videoUrl} />
      </Sidebar.Tab>
    </DefaultSidebar>
  );
}
