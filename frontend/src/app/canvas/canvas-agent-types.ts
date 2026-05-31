import type { AppRouter } from "@porto/api";
import type { inferRouterOutputs } from "@trpc/server";

type RouterOutputs = inferRouterOutputs<AppRouter>;

export type WorkflowRow = RouterOutputs["canvasAgent"]["listWorkflows"][number];
export type WorkflowDetail = RouterOutputs["canvasAgent"]["getWorkflow"];
export type WorkflowSummary = RouterOutputs["canvasAgent"]["getWorkflowSummary"];
export type ServerMessageRow = WorkflowDetail["messages"][number];
export type ProposalRow = WorkflowDetail["proposals"][number];
export type RunRow = WorkflowDetail["runs"][number];

export type ProposalStatus =
  | "pending_approval"
  | "approved"
  | "rejected"
  | "applied"
  | "failed";

export type FrameRef = {
  id: string;
  name: string | null;
  mention: string;
  elementIds: string[];
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  customData?: Record<string, unknown>;
};

export type ProposalChange =
  | { type: "add"; element: unknown }
  | { type: "update"; elementId: string; patch: Record<string, unknown> }
  | { type: "delete"; elementId: string };

export type CanvasAgentMessage = Omit<ServerMessageRow, "id" | "metadata"> & {
  id: number | string;
  metadata: Record<string, unknown>;
};

export type CanvasAgentMessagePage = {
  items: CanvasAgentMessage[];
  nextCursor: number | null;
};

export type CanvasAgentStreamEvent =
  | {
      type: "user_message";
      message: ServerMessageRow;
      clientMessageId?: string;
    }
  | { type: "run_started"; run: RunRow }
  | { type: "assistant_delta"; runId: number; delta: string }
  | { type: "assistant_message"; message: ServerMessageRow; runId: number }
  | { type: "proposal_created"; proposal: ProposalRow; runId: number }
  | { type: "run_completed"; run: RunRow }
  | { type: "run_failed"; run: RunRow | null; errorMessage: string }
  | { type: "agent_disabled"; message: string };
