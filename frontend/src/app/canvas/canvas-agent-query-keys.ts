export const canvasAgentKeys = {
  all: ["canvasAgent"] as const,
  workflows: () => [...canvasAgentKeys.all, "workflows"] as const,
  workflow: (id: number) => [...canvasAgentKeys.all, "workflow", id] as const,
  messages: (workflowId: number) =>
    [...canvasAgentKeys.workflow(workflowId), "messages"] as const,
  runs: (workflowId: number) =>
    [...canvasAgentKeys.workflow(workflowId), "runs"] as const,
  proposals: (workflowId: number) =>
    [...canvasAgentKeys.workflow(workflowId), "proposals"] as const,
  scene: (workflowId: number) =>
    [...canvasAgentKeys.workflow(workflowId), "scene"] as const,
};
