export const canvasWorkspaceKeys = {
  all: ["canvasWorkspace"] as const,
  workspaces: () => [...canvasWorkspaceKeys.all, "workspaces"] as const,
  workspace: (workspaceId: number) =>
    [...canvasWorkspaceKeys.all, "workspace", workspaceId] as const,
  scene: (workspaceId: number) =>
    [...canvasWorkspaceKeys.workspace(workspaceId), "scene"] as const,
};

export const canvasAgentThreadKeys = {
  all: ["canvasAgentThread"] as const,
  thread: (workspaceId: number) =>
    [...canvasAgentThreadKeys.all, "workspace", workspaceId] as const,
  snapshot: (workspaceId: number) =>
    [...canvasAgentThreadKeys.thread(workspaceId), "snapshot"] as const,
  messages: (workspaceId: number) =>
    [...canvasAgentThreadKeys.thread(workspaceId), "messages"] as const,
  runs: (workspaceId: number) =>
    [...canvasAgentThreadKeys.thread(workspaceId), "runs"] as const,
  proposals: (workspaceId: number) =>
    [...canvasAgentThreadKeys.thread(workspaceId), "proposals"] as const,
};
