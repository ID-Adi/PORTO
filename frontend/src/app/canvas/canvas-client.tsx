"use client";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { useHasMounted } from "@/hooks/use-has-mounted";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";

import { exportScenePNG, exportSceneSVG } from "./canvas-export";
import { loadLocalFiles, saveLocalFiles } from "./canvas-files-store";
import {
  isRemoteNewer,
  loadLocalScene,
  saveLocalScene,
  type RemoteScene,
} from "./canvas-storage";

import "@excalidraw/excalidraw/index.css";
import "./canvas.css";

import type {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types";
import type { OrderedExcalidrawElement } from "@excalidraw/excalidraw/element/types";

if (typeof window !== "undefined") {
  (window as unknown as { EXCALIDRAW_ASSET_PATH?: string }).EXCALIDRAW_ASSET_PATH =
    "/excalidraw-assets/";
}

const CanvasExcalidraw = dynamic(
  () => import("./canvas-excalidraw").then((m) => m.CanvasExcalidraw),
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

type CanvasClientProps = {
  headerCollapsed: boolean;
  onToggleHeader: () => void;
};

function slimAppState(appState: AppState): Partial<AppState> {
  return {
    viewBackgroundColor: appState.viewBackgroundColor,
    currentItemStrokeColor: appState.currentItemStrokeColor,
    currentItemBackgroundColor: appState.currentItemBackgroundColor,
    currentItemFillStyle: appState.currentItemFillStyle,
    currentItemStrokeWidth: appState.currentItemStrokeWidth,
    currentItemRoughness: appState.currentItemRoughness,
    currentItemOpacity: appState.currentItemOpacity,
    currentItemFontFamily: appState.currentItemFontFamily,
    currentItemFontSize: appState.currentItemFontSize,
    currentItemTextAlign: appState.currentItemTextAlign,
    currentItemStartArrowhead: appState.currentItemStartArrowhead,
    currentItemEndArrowhead: appState.currentItemEndArrowhead,
    zoom: appState.zoom,
    scrollX: appState.scrollX,
    scrollY: appState.scrollY,
  };
}

export function CanvasClient({ headerCollapsed, onToggleHeader }: CanvasClientProps) {
  const { resolvedTheme } = useTheme();
  const mounted = useHasMounted();
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const saveTimer = useRef<number | null>(null);
  const autoLoadedRef = useRef(false);
  const filesRestoredRef = useRef(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);

  const { data: session } = authClient.useSession();
  const user = session?.user;
  const isAuthed = Boolean(user);

  const remoteQuery = trpc.canvas.get.useQuery(undefined, {
    enabled: mounted && isAuthed,
    staleTime: 60_000,
  });
  const upsertMutation = trpc.canvas.upsert.useMutation();

  const handleChange = useCallback(
    (
      elements: readonly OrderedExcalidrawElement[],
      appState: AppState,
      files: BinaryFiles
    ) => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        saveLocalScene(elements, appState);
        // files (dataURL gambar/poster video) disimpan terpisah di IndexedDB
        // agar elemen image tetap punya datanya setelah unmount/remount.
        void saveLocalFiles(files);
      }, 400);
    },
    []
  );

  // Saat Excalidraw siap, muat kembali files dari IndexedDB dan tambahkan via
  // addFiles. Excalidraw merender ulang elemen image begitu file-nya tersedia.
  const handleApiReady = useCallback((api: ExcalidrawImperativeAPI) => {
    apiRef.current = api;
    if (filesRestoredRef.current) return;
    filesRestoredRef.current = true;
    void loadLocalFiles().then((files) => {
      if (files) api.addFiles(Object.values(files));
    });
  }, []);

  const isDark = resolvedTheme === "dark";

  const initialData = useMemo(() => {
    const defaultAppState = {
      viewBackgroundColor: "transparent",
      currentItemStrokeColor: isDark ? "#fafafa" : "#141414",
      currentItemStrokeWidth: 1,
      currentItemRoughness: 0,
      currentItemOpacity: 100,
      currentItemFontFamily: 3,
      currentItemFontSize: 16,
      currentItemTextAlign: "left" as const,
      currentItemStartArrowhead: null,
      currentItemEndArrowhead: "arrow" as const,
    };
    const saved = loadLocalScene();
    if (!saved) return { appState: defaultAppState };
    return {
      elements: saved.elements,
      appState: { ...defaultAppState, ...saved.appState },
    };
    // initialData hanya dibaca sekali saat mount Excalidraw, jadi dependency
    // theme dibekukan ke nilai pertama; mengubah tema tidak mereset scene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExportPNG = useCallback(async () => {
    if (!apiRef.current) return;
    const ok = await exportScenePNG(apiRef.current);
    if (!ok) toast.info("Kanvas kosong — tidak ada yang diekspor");
  }, []);

  const handleExportSVG = useCallback(async () => {
    if (!apiRef.current) return;
    const ok = await exportSceneSVG(apiRef.current);
    if (!ok) toast.info("Kanvas kosong — tidak ada yang diekspor");
  }, []);

  const handleSaveCloud = useCallback(async () => {
    if (!apiRef.current) return;
    const elements = apiRef.current.getSceneElements();
    const appState = apiRef.current.getAppState();
    const files = apiRef.current.getFiles();
    try {
      await upsertMutation.mutateAsync({
        sceneData: { elements, appState: slimAppState(appState), files },
      });
      toast.success("Tersimpan ke cloud");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal menyimpan ke cloud"
      );
    }
  }, [upsertMutation]);

  const applyRemoteScene = useCallback((remote: RemoteScene) => {
    if (!apiRef.current) return;
    apiRef.current.updateScene({
      elements: remote.elements,
      // Excalidraw mengetik `appState` sebagai Pick<AppState, K> — cast via
      // unknown karena bentuk JSON dari backend secara struktural cocok
      // dengan subset AppState yang kita persist (lihat slimAppState).
      appState: remote.appState as unknown as Pick<AppState, keyof AppState>,
    });
    // Sertakan kembali files agar thumbnail image/video ikut termuat.
    if (remote.files) apiRef.current.addFiles(Object.values(remote.files));
  }, []);

  const handleLoadCloud = useCallback(async () => {
    const result = await remoteQuery.refetch();
    const row = result.data;
    if (!row || !apiRef.current) {
      toast.info("Belum ada kanvas tersimpan di cloud");
      return;
    }
    applyRemoteScene(row.sceneData as RemoteScene);
    toast.success("Dimuat dari cloud");
  }, [remoteQuery, applyRemoteScene]);

  const handleLinkOpen = useCallback(
    (element: { customData?: unknown }, event: { preventDefault: () => void }) => {
      const cd = element.customData as
        | { kind?: string; videoUrl?: string }
        | undefined;
      if (cd?.kind === "video" && cd.videoUrl) {
        event.preventDefault();
        setActiveVideoUrl(cd.videoUrl);
        apiRef.current?.toggleSidebar({
          name: "default",
          tab: "video",
          force: true,
        });
      }
    },
    []
  );

  // Auto-load remote saat tersedia & lebih baru dari local. Jalankan sekali
  // per session canvas (autoLoadedRef) untuk menghindari overwrite saat
  // remote re-fetch (mis. window focus).
  useEffect(() => {
    if (autoLoadedRef.current) return;
    if (!apiRef.current) return;
    const row = remoteQuery.data;
    if (!row) return;
    const local = loadLocalScene();
    if (isRemoteNewer(local, row.updatedAt)) {
      applyRemoteScene(row.sceneData as RemoteScene);
      toast.success("Kanvas dimuat dari cloud");
    }
    autoLoadedRef.current = true;
  }, [remoteQuery.data, applyRemoteScene]);

  if (!mounted) return <CanvasLoader />;

  return (
    <div className="canvas-porto-wrapper flex-1 overflow-hidden">
      <CanvasExcalidraw
        isDark={isDark}
        initialData={initialData}
        headerCollapsed={headerCollapsed}
        onToggleHeader={onToggleHeader}
        activeVideoUrl={activeVideoUrl}
        apiRef={apiRef}
        onApiReady={handleApiReady}
        isAuthed={isAuthed}
        upsertPending={upsertMutation.isPending}
        remoteFetching={remoteQuery.isFetching}
        onChange={handleChange}
        onLinkOpen={handleLinkOpen}
        onExportPNG={handleExportPNG}
        onExportSVG={handleExportSVG}
        onSaveCloud={handleSaveCloud}
        onLoadCloud={handleLoadCloud}
      />
    </div>
  );
}
