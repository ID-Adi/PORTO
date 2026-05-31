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
  loadLocalScene,
  saveLocalScene,
  type RemoteScene,
} from "./canvas-storage";
import {
  CanvasWorkflowProvider,
  persistWorkflowId,
  readStoredWorkflowId,
  type CanvasWorkflowContextValue,
} from "./canvas-workflow-context";
import { CanvasWorkflowPicker } from "./canvas-workflow-picker";

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
  const cloudSaveTimer = useRef<number | null>(null);
  const cloudBootstrappedRef = useRef(false);
  // Scene workflow aktif sudah dimuat dari cloud → autosave cloud boleh jalan.
  const cloudReadyRef = useRef(false);
  // Ada perubahan canvas yang belum tersimpan ke DB.
  const dirtyRef = useRef(false);
  // Ref ke saveCurrentSceneTo (didefinisikan di bawah) agar bisa dipakai oleh
  // flushCloudSave tanpa masalah urutan deklarasi.
  const saveCurrentSceneToRef = useRef<(id: number) => Promise<void>>(
    async () => {},
  );
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);

  const { data: session } = authClient.useSession();
  const user = session?.user;
  const isAuthed = Boolean(user);

  const utils = trpc.useUtils();
  const saveSceneMutation = trpc.canvasAgent.saveWorkflowScene.useMutation();
  const createWorkflowMutation = trpc.canvasAgent.createWorkflow.useMutation();

  // Workflow aktif — sumber kebenaran tunggal (canvas scene + agent chat).
  const [activeWorkflowId, setActiveWorkflowIdState] = useState<number | null>(
    () => readStoredWorkflowId()
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  // Mirror nilai ke ref agar bisa dibaca di callback stabil.
  const activeWorkflowIdRef = useRef(activeWorkflowId);
  const isAuthedRef = useRef(isAuthed);
  useEffect(() => {
    activeWorkflowIdRef.current = activeWorkflowId;
  }, [activeWorkflowId]);
  useEffect(() => {
    isAuthedRef.current = isAuthed;
  }, [isAuthed]);

  const setActiveWorkflowId = useCallback((id: number | null) => {
    setActiveWorkflowIdState(id);
    activeWorkflowIdRef.current = id;
    persistWorkflowId(id);
  }, []);

  // Simpan scene aktif ke DB di background. Dipanggil oleh autosave & saat unload.
  const flushCloudSave = useCallback(async () => {
    const id = activeWorkflowIdRef.current;
    if (!isAuthedRef.current || id === null || !cloudReadyRef.current) return;
    if (!apiRef.current) return;
    try {
      await saveCurrentSceneToRef.current(id);
      dirtyRef.current = false;
      void utils.canvasAgent.listWorkflows.invalidate();
    } catch {
      // Biarkan dirty tetap true agar dicoba lagi / beforeunload memperingatkan.
    }
  }, [utils]);

  const handleChange = useCallback(
    (
      elements: readonly OrderedExcalidrawElement[],
      appState: AppState,
      files: BinaryFiles
    ) => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        // Draft lokal (working scene) — terpisah dari cloud per-workflow.
        saveLocalScene(elements, appState);
        void saveLocalFiles(files);
      }, 400);

      // Autosave cloud (debounce lebih panjang) hanya bila scene workflow aktif
      // sudah dimuat, supaya tidak menimpa DB dengan kanvas kosong saat awal.
      if (
        isAuthedRef.current &&
        activeWorkflowIdRef.current !== null &&
        cloudReadyRef.current
      ) {
        dirtyRef.current = true;
        if (cloudSaveTimer.current) window.clearTimeout(cloudSaveTimer.current);
        cloudSaveTimer.current = window.setTimeout(() => {
          void flushCloudSave();
        }, 1500);
      }
    },
    [flushCloudSave]
  );

  const applyRemoteScene = useCallback((remote: RemoteScene) => {
    if (!apiRef.current) return;
    apiRef.current.updateScene({
      elements: remote.elements,
      appState: remote.appState as unknown as Pick<AppState, keyof AppState>,
    });
    if (remote.files) apiRef.current.addFiles(Object.values(remote.files));
  }, []);

  // Terapkan scene workflow ke canvas (atau kosongkan bila workflow belum punya
  // scene). Sinkronkan juga draft lokal supaya konsisten saat remount.
  const applyWorkflowScene = useCallback(
    (scene: RemoteScene | null) => {
      if (!apiRef.current) return;
      if (!scene || !Array.isArray(scene.elements)) {
        apiRef.current.updateScene({ elements: [] });
        return;
      }
      applyRemoteScene(scene);
      saveLocalScene(
        scene.elements,
        scene.appState as unknown as AppState
      );
      if (scene.files) void saveLocalFiles(scene.files);
    },
    [applyRemoteScene]
  );

  const loadWorkflowScene = useCallback(
    async (id: number) => {
      try {
        // Endpoint khusus scene — tak menarik messages/proposals/runs.
        const data = await utils.canvasAgent.getWorkflowScene.fetch({ id });
        applyWorkflowScene((data?.sceneData ?? null) as RemoteScene | null);
      } catch {
        // workflow tak ditemukan / belum login — biarkan canvas apa adanya.
      } finally {
        // Scene workflow aktif sudah final di canvas → autosave cloud boleh jalan.
        cloudReadyRef.current = true;
        dirtyRef.current = false;
      }
    },
    [utils, applyWorkflowScene]
  );

  const saveCurrentSceneTo = useCallback(
    async (id: number) => {
      if (!apiRef.current) return;
      const elements = apiRef.current.getSceneElements();
      const appState = apiRef.current.getAppState();
      const files = apiRef.current.getFiles();
      await saveSceneMutation.mutateAsync({
        id,
        sceneData: { elements, appState: slimAppState(appState), files },
      });
    },
    [saveSceneMutation]
  );

  useEffect(() => {
    saveCurrentSceneToRef.current = saveCurrentSceneTo;
  }, [saveCurrentSceneTo]);

  // Pindah workflow (2-arah): auto-save scene aktif → set aktif → muat scene baru.
  const switchWorkflow = useCallback(
    async (nextId: number | null) => {
      const prev = activeWorkflowIdRef.current;
      // Scene baru belum dimuat → matikan autosave cloud sementara agar tidak
      // menimpa workflow tujuan dengan kanvas lama.
      cloudReadyRef.current = false;
      if (cloudSaveTimer.current) window.clearTimeout(cloudSaveTimer.current);

      // UI berpindah instan; simpan scene lama & muat scene baru paralel
      // karena keduanya menyasar workflow berbeda (independen).
      setActiveWorkflowId(nextId);
      void utils.canvasAgent.listWorkflows.invalidate();

      // Hanya simpan scene lama bila memang ada perubahan (dirty). Autosave
      // cloud sudah menyimpan tiap edit, jadi mayoritas switch tak perlu save —
      // ini yang membuat perpindahan terasa cepat.
      const savePrev =
        prev !== null && prev !== nextId && apiRef.current && dirtyRef.current
          ? saveCurrentSceneTo(prev).catch(() => {
              // best-effort — jangan blok perpindahan kalau gagal simpan.
            })
          : Promise.resolve();
      const loadNext =
        nextId !== null
          ? loadWorkflowScene(nextId)
          : Promise.resolve(applyWorkflowScene(null));

      await Promise.all([savePrev, loadNext]);
    },
    [
      saveCurrentSceneTo,
      setActiveWorkflowId,
      loadWorkflowScene,
      applyWorkflowScene,
      utils,
    ]
  );

  // Pastikan ada workflow aktif; bila belum ada, buat baru & ADOPSI scene canvas
  // saat ini (tanpa mengosongkan kanvas). Return id workflow aktif.
  const ensureWorkflow = useCallback(
    async (title = "Untitled workflow"): Promise<number> => {
      const existing = activeWorkflowIdRef.current;
      if (existing !== null) return existing;
      const row = await createWorkflowMutation.mutateAsync({ title });
      setActiveWorkflowId(row.id);
      // Kanvas saat ini menjadi scene workflow baru → cloud boleh autosave.
      cloudReadyRef.current = true;
      // Adopsi scene non-blocking supaya create terasa instan.
      void saveCurrentSceneTo(row.id).catch(() => {
        // best-effort adopsi scene
      });
      void utils.canvasAgent.listWorkflows.invalidate();
      return row.id;
    },
    [createWorkflowMutation, setActiveWorkflowId, saveCurrentSceneTo, utils]
  );

  const saveActiveScene = useCallback(async () => {
    try {
      const id = await ensureWorkflow("Canvas workflow");
      await saveCurrentSceneTo(id);
      dirtyRef.current = false;
      void utils.canvasAgent.listWorkflows.invalidate();
      void utils.canvasAgent.getWorkflow.invalidate({ id });
      toast.success("Tersimpan ke workflow");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal menyimpan ke cloud"
      );
    }
  }, [ensureWorkflow, saveCurrentSceneTo, utils]);

  // Auto-load scene workflow aktif sekali (setelah API siap & user login).
  const maybeBootstrapCloud = useCallback(() => {
    if (cloudBootstrappedRef.current) return;
    if (!apiRef.current || !isAuthedRef.current) return;
    const id = activeWorkflowIdRef.current;
    if (id === null) return;
    cloudBootstrappedRef.current = true;
    void loadWorkflowScene(id);
  }, [loadWorkflowScene]);

  // Saat CanvasPawa siap: pasang apiRef, restore files lokal, lalu coba bootstrap
  // scene workflow dari cloud (kalau ada workflow aktif & sudah login).
  const handleApiReady = useCallback(
    (api: ExcalidrawImperativeAPI) => {
      apiRef.current = api;
      void loadLocalFiles().then((files) => {
        if (files) api.addFiles(Object.values(files));
      });
      maybeBootstrapCloud();
    },
    [maybeBootstrapCloud]
  );

  // Auth bisa resolve setelah API ready — coba bootstrap lagi.
  useEffect(() => {
    if (isAuthed) maybeBootstrapCloud();
  }, [isAuthed, maybeBootstrapCloud]);

  // Peringatkan user bila masih ada perubahan yang belum tersimpan ke DB.
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // Bersihkan timer autosave cloud saat unmount.
  useEffect(() => {
    return () => {
      if (cloudSaveTimer.current) window.clearTimeout(cloudSaveTimer.current);
    };
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
    // initialData hanya dibaca sekali saat mount CanvasPawa.
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

  const handleLoadCloud = useCallback(() => {
    setPickerOpen(true);
  }, []);

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

  const workflowContext = useMemo<CanvasWorkflowContextValue>(
    () => ({
      activeWorkflowId,
      switchWorkflow,
      saveActiveScene,
      ensureWorkflow,
      openPicker: () => setPickerOpen(true),
    }),
    [activeWorkflowId, switchWorkflow, saveActiveScene, ensureWorkflow]
  );

  if (!mounted) return <CanvasLoader />;

  return (
    <CanvasWorkflowProvider value={workflowContext}>
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
          upsertPending={
            saveSceneMutation.isPending || createWorkflowMutation.isPending
          }
          remoteFetching={false}
          onChange={handleChange}
          onLinkOpen={handleLinkOpen}
          onExportPNG={handleExportPNG}
          onExportSVG={handleExportSVG}
          onSaveCloud={saveActiveScene}
          onLoadCloud={handleLoadCloud}
        />
        <CanvasWorkflowPicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          isAuthed={isAuthed}
        />
      </div>
    </CanvasWorkflowProvider>
  );
}
