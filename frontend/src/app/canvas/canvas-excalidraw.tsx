"use client";

import { Excalidraw, MainMenu } from "@excalidraw/excalidraw";
import { ChevronUp, Download } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { CanvasExtraSidebar } from "./canvas-extra-sidebar";
import { CanvasToolsPicker } from "./canvas-tools-picker";

import "@excalidraw/excalidraw/index.css";
import "./canvas.css";

import type {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types";
import type { OrderedExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { RefObject } from "react";

type CanvasExcalidrawProps = {
  isDark: boolean;
  initialData: { elements?: readonly OrderedExcalidrawElement[]; appState: Partial<AppState> };
  headerCollapsed: boolean;
  onToggleHeader: () => void;
  activeVideoUrl: string | null;
  apiRef: RefObject<ExcalidrawImperativeAPI | null>;
  onApiReady?: (api: ExcalidrawImperativeAPI) => void;
  isAuthed: boolean;
  upsertPending: boolean;
  remoteFetching: boolean;
  onChange: (
    elements: readonly OrderedExcalidrawElement[],
    appState: AppState,
    files: BinaryFiles
  ) => void;
  onLinkOpen: (
    element: { customData?: unknown },
    event: { preventDefault: () => void }
  ) => void;
  onExportPNG: () => void;
  onExportSVG: () => void;
  onSaveCloud: () => void;
  onLoadCloud: () => void;
};

export function CanvasExcalidraw({
  isDark,
  initialData,
  headerCollapsed,
  onToggleHeader,
  activeVideoUrl,
  apiRef,
  onApiReady,
  isAuthed,
  upsertPending,
  remoteFetching,
  onChange,
  onLinkOpen,
  onExportPNG,
  onExportSVG,
  onSaveCloud,
  onLoadCloud,
}: CanvasExcalidrawProps) {
  return (
    <Excalidraw
      excalidrawAPI={(api) => {
        apiRef.current = api;
        onApiReady?.(api);
      }}
      onChange={onChange}
      onLinkOpen={onLinkOpen as never}
      theme={isDark ? "dark" : "light"}
      renderTopRightUI={() => (
        <div className="canvas-top-right-actions">
          <button
            type="button"
            onClick={onToggleHeader}
            aria-expanded={!headerCollapsed}
            aria-label={
              headerCollapsed ? "Tampilkan header" : "Sembunyikan header"
            }
            title={headerCollapsed ? "Tampilkan header" : "Sembunyikan header"}
            className="canvas-header-toggle"
          >
            <ChevronUp
              aria-hidden
              className={cn(
                "size-4 transition-transform duration-200",
                headerCollapsed && "rotate-180"
              )}
            />
          </button>
          <CanvasToolsPicker apiRef={apiRef} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Ekspor kanvas"
                title="Ekspor kanvas"
                className="canvas-header-toggle"
              >
                <Download aria-hidden className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={6}
              className="w-48 rounded-none border border-line bg-background p-1 font-mono shadow-none"
            >
              <DropdownMenuItem
                onSelect={onSaveCloud}
                disabled={!isAuthed || upsertPending}
                className="rounded-none text-[12px]"
              >
                Simpan ke cloud
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={onLoadCloud}
                disabled={!isAuthed || remoteFetching}
                className="rounded-none text-[12px]"
              >
                Muat dari cloud
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-line" />
              <DropdownMenuItem
                onSelect={onExportPNG}
                className="rounded-none text-[12px]"
              >
                Ekspor PNG
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={onExportSVG}
                className="rounded-none text-[12px]"
              >
                Ekspor SVG
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      UIOptions={{
        canvasActions: {
          toggleTheme: false,
          changeViewBackgroundColor: false,
        },
        tools: { image: true },
        // Sidebar selalu dockable di ukuran layar apa pun, sehingga bisa
        // di-pin terbuka dan tidak auto-close saat user berinteraksi di canvas.
        dockedSidebarBreakpoint: 0,
      }}
      initialData={initialData}
      langCode="id-ID"
    >
      <MainMenu>
        <MainMenu.DefaultItems.LoadScene />
        <MainMenu.DefaultItems.SaveToActiveFile />
        <MainMenu.DefaultItems.Export />
        <MainMenu.DefaultItems.SaveAsImage />
        <MainMenu.DefaultItems.SearchMenu />
        <MainMenu.DefaultItems.Help />
        <MainMenu.DefaultItems.ClearCanvas />
        <MainMenu.Separator />
        <MainMenu.DefaultItems.ToggleTheme />
        <MainMenu.DefaultItems.ChangeCanvasBackground />
      </MainMenu>
      <CanvasExtraSidebar
        videoUrl={activeVideoUrl}
        apiRef={apiRef}
        isAuthed={isAuthed}
      />
    </Excalidraw>
  );
}
