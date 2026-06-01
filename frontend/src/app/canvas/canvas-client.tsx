"use client";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { useHasMounted } from "@/hooks/use-has-mounted";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";

import { exportScenePNG, exportSceneSVG } from "./canvas-export";
import { loadLocalFiles, saveLocalFiles } from "./canvas-files-store";
import {
  loadLocalWorkspaceScene,
  loadLocalScene,
  saveLocalScene,
  saveLocalWorkspaceScene,
  type RemoteScene,
} from "./canvas-storage";
import { canvasWorkspaceKeys } from "./canvas-agent-query-keys";
import {
  fetchWorkspaceScene,
  prefetchWorkspaceBundle,
} from "./canvas-workspace-prefetch";
import {
  CanvasWorkspaceProvider,
  persistWorkspaceId,
  readStoredWorkspaceId,
  type CanvasWorkspaceContextValue,
} from "./canvas-workspace-context";
import { CanvasWorkspacePicker } from "./canvas-workspace-picker";

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
  const sceneTransitionRef = useRef(0);
  // Scene workspace aktif sudah dimuat dari cloud/cache → autosave cloud boleh jalan.
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

  const queryClient = useQueryClient();
  const saveSceneMutation = trpc.canvasAgent.saveWorkflowScene.useMutation();
  const createWorkflowMutation = trpc.canvasAgent.createWorkflow.useMutation();

  // Workspace aktif — sumber kebenaran tunggal untuk canvas scene.
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<number | null>(
    () => readStoredWorkspaceId()
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  // Mirror nilai ke ref agar bisa dibaca di callback stabil.
  const activeWorkspaceIdRef = useRef(activeWorkspaceId);
  const isAuthedRef = useRef(isAuthed);
  useEffect(() => {
    activeWorkspaceIdRef.current = activeWorkspaceId;
  }, [activeWorkspaceId]);
  useEffect(() => {
    isAuthedRef.current = isAuthed;
  }, [isAuthed]);

  const setActiveWorkspaceId = useCallback((id: number | null) => {
    setActiveWorkspaceIdState(id);
    activeWorkspaceIdRef.current = id;
    persistWorkspaceId(id);
  }, []);

  // Simpan scene aktif ke DB di background. Dipanggil oleh autosave & saat unload.
  const flushCloudSave = useCallback(async () => {
    const id = activeWorkspaceIdRef.current;
    if (!isAuthedRef.current || id === null || !cloudReadyRef.current) return;
    if (!apiRef.current) return;
    try {
      await saveCurrentSceneToRef.current(id);
      dirtyRef.current = false;
      void queryClient.invalidateQueries({
        queryKey: canvasWorkspaceKeys.workspaces(),
      });
    } catch {
      // Biarkan dirty tetap true agar dicoba lagi / beforeunload memperingatkan.
    }
  }, [queryClient]);

  const handleChange = useCallback(
    (
      elements: readonly OrderedExcalidrawElement[],
      appState: AppState,
      files: BinaryFiles
    ) => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        const workspaceId = activeWorkspaceIdRef.current;
        // Draft lokal global tetap disimpan sebagai fallback lama.
        saveLocalScene(elements, appState);
        void saveLocalFiles(files);
        if (workspaceId !== null) {
          saveLocalWorkspaceScene(workspaceId, elements, appState);
          void saveLocalFiles(files, workspaceId);
        }
      }, 400);

      // Autosave cloud (debounce lebih panjang) hanya bila scene workspace aktif
      // sudah dimuat, supaya tidak menimpa DB dengan kanvas kosong saat awal.
      if (
        isAuthedRef.current &&
        activeWorkspaceIdRef.current !== null &&
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

  // Terapkan scene workspace ke canvas (atau kosongkan bila workspace belum punya
  // scene). Sinkronkan juga draft lokal supaya konsisten saat remount.
  const applyWorkspaceScene = useCallback(
    (scene: RemoteScene | null, workspaceId?: number) => {
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
      if (workspaceId !== undefined) {
        saveLocalWorkspaceScene(workspaceId, scene.elements, scene.appState);
      }
      if (scene.files) void saveLocalFiles(scene.files);
      if (scene.files && workspaceId !== undefined) {
        void saveLocalFiles(scene.files, workspaceId);
      }
    },
    [applyRemoteScene]
  );

  const loadWorkspaceScene = useCallback(
    async (id: number, transitionId = sceneTransitionRef.current) => {
      let appliedScene = false;
      const local = loadLocalWorkspaceScene(id);
      if (
        local &&
        Array.isArray(local.elements) &&
        transitionId === sceneTransitionRef.current &&
        activeWorkspaceIdRef.current === id
      ) {
        applyWorkspaceScene(
          {
            elements: local.elements,
            appState: local.appState,
          },
          id,
        );
        appliedScene = true;
        void loadLocalFiles(id).then((files) => {
          if (
            files &&
            transitionId === sceneTransitionRef.current &&
            activeWorkspaceIdRef.current === id
          ) {
            apiRef.current?.addFiles(Object.values(files));
          }
        });
      }

      try {
        // Endpoint khusus scene — tak menarik messages/proposals/runs.
        const data = await fetchWorkspaceScene(queryClient, id);
        if (
          transitionId !== sceneTransitionRef.current ||
          activeWorkspaceIdRef.current !== id
        ) {
          return;
        }
        applyWorkspaceScene((data?.sceneData ?? null) as RemoteScene | null, id);
        appliedScene = true;
      } catch {
        if (!appliedScene && activeWorkspaceIdRef.current === id) {
          applyWorkspaceScene(null, id);
        }
      } finally {
        if (
          transitionId === sceneTransitionRef.current &&
          activeWorkspaceIdRef.current === id
        ) {
          // Scene workspace aktif sudah final di canvas → autosave cloud boleh jalan.
          cloudReadyRef.current = true;
          dirtyRef.current = false;
        }
      }
    },
    [queryClient, applyWorkspaceScene]
  );

  const saveCurrentSceneTo = useCallback(
    async (id: number) => {
      if (!apiRef.current) return;
      const elements = apiRef.current.getSceneElements();
      const appState = apiRef.current.getAppState();
      const files = apiRef.current.getFiles();
      const sceneData = { elements, appState: slimAppState(appState), files };
      await saveSceneMutation.mutateAsync({
        id,
        sceneData,
      });
      saveLocalWorkspaceScene(id, elements, appState);
      void saveLocalFiles(files, id);
      queryClient.setQueryData(canvasWorkspaceKeys.scene(id), {
        sceneData,
      });
    },
    [queryClient, saveSceneMutation]
  );

  useEffect(() => {
    saveCurrentSceneToRef.current = saveCurrentSceneTo;
  }, [saveCurrentSceneTo]);

  // Pindah workspace: save lama fire-and-forget → set aktif → muat scene baru.
  const switchWorkspace = useCallback(
    async (nextId: number | null) => {
      const prev = activeWorkspaceIdRef.current;
      const transitionId = sceneTransitionRef.current + 1;
      sceneTransitionRef.current = transitionId;
      // Scene baru belum dimuat → matikan autosave cloud sementara agar tidak
      // menimpa workspace tujuan dengan kanvas lama.
      cloudReadyRef.current = false;
      if (cloudSaveTimer.current) window.clearTimeout(cloudSaveTimer.current);

      // UI berpindah instan.
      setActiveWorkspaceId(nextId);

      // Fire-and-forget: simpan scene lama di background tanpa memblokir
      // perpindahan. User tak perlu menunggu save selesai untuk melihat scene
      // baru. Invalidate list hanya setelah save berhasil (deduplikasi).
      if (prev !== null && prev !== nextId && apiRef.current && dirtyRef.current) {
        void saveCurrentSceneTo(prev)
          .then(() => {
            dirtyRef.current = false;
            void queryClient.invalidateQueries({
              queryKey: canvasWorkspaceKeys.workspaces(),
            });
          })
          .catch(() => {
            // best-effort — scene lama akan dicoba lagi oleh autosave berikutnya.
          });
      }

      // Hanya await load scene tujuan — satu-satunya operasi blocking.
      if (nextId !== null) {
        void prefetchWorkspaceBundle(queryClient, nextId);
        await loadWorkspaceScene(nextId, transitionId);
      } else {
        applyWorkspaceScene(null);
        cloudReadyRef.current = false;
        dirtyRef.current = false;
      }
    },
    [
      queryClient,
      saveCurrentSceneTo,
      setActiveWorkspaceId,
      loadWorkspaceScene,
      applyWorkspaceScene,
    ]
  );

  // Pastikan ada workspace aktif; bila belum ada, buat baru & ADOPSI scene canvas
  // saat ini (tanpa mengosongkan kanvas). Return id workspace aktif.
  const ensureWorkspace = useCallback(
    async (title = "Untitled workspace"): Promise<number> => {
      const existing = activeWorkspaceIdRef.current;
      if (existing !== null) return existing;
      const row = await createWorkflowMutation.mutateAsync({ title });
      setActiveWorkspaceId(row.id);
      queryClient.setQueryData(canvasWorkspaceKeys.workspace(row.id), row);
      // Kanvas saat ini menjadi scene workspace baru → cloud boleh autosave.
      cloudReadyRef.current = true;
      // Adopsi scene non-blocking supaya create terasa instan.
      void saveCurrentSceneTo(row.id).catch(() => {
        // best-effort adopsi scene
      });
      void queryClient.invalidateQueries({
        queryKey: canvasWorkspaceKeys.workspaces(),
      });
      return row.id;
    },
    [
      createWorkflowMutation,
      queryClient,
      setActiveWorkspaceId,
      saveCurrentSceneTo,
    ]
  );

  const saveActiveScene = useCallback(async () => {
    try {
      const id = await ensureWorkspace("Canvas workspace");
      await saveCurrentSceneTo(id);
      dirtyRef.current = false;
      void queryClient.invalidateQueries({
        queryKey: canvasWorkspaceKeys.workspaces(),
      });
      void queryClient.invalidateQueries({
        queryKey: canvasWorkspaceKeys.workspace(id),
      });
      toast.success("Tersimpan ke workspace");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal menyimpan ke cloud"
      );
    }
  }, [ensureWorkspace, queryClient, saveCurrentSceneTo]);

  // Auto-load scene workspace aktif sekali (setelah API siap & user login).
  const maybeBootstrapCloud = useCallback(() => {
    if (cloudBootstrappedRef.current) return;
    if (!apiRef.current || !isAuthedRef.current) return;
    const id = activeWorkspaceIdRef.current;
    if (id === null) return;
    cloudBootstrappedRef.current = true;
    void loadWorkspaceScene(id);
  }, [loadWorkspaceScene]);

  // Saat CanvasPawa siap: pasang apiRef, restore files lokal, lalu coba bootstrap
  // scene workspace dari cloud (kalau ada workspace aktif & sudah login).
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
    const storedWorkspaceId = readStoredWorkspaceId();
    const saved =
      storedWorkspaceId !== null
        ? loadLocalWorkspaceScene(storedWorkspaceId) ?? loadLocalScene()
        : loadLocalScene();
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

  const workspaceContext = useMemo<CanvasWorkspaceContextValue>(
    () => ({
      activeWorkspaceId,
      switchWorkspace,
      saveActiveScene,
      ensureWorkspace,
      openPicker: () => setPickerOpen(true),
    }),
    [activeWorkspaceId, switchWorkspace, saveActiveScene, ensureWorkspace]
  );

  if (!mounted) return <CanvasLoader />;

  return (
    <CanvasWorkspaceProvider value={workspaceContext}>
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
        <CanvasWorkspacePicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          isAuthed={isAuthed}
        />
      </div>
    </CanvasWorkspaceProvider>
  );
}
