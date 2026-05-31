"use client";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type {
  ExcalidrawFrameElement,
  OrderedExcalidrawElement,
} from "@excalidraw/excalidraw/element/types";
import type { FrameRef, ProposalChange } from "./canvas-agent-types";

export function normalizeMention(value: string) {
  return value
    .replace(/^@/, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function mentionFromName(name: string | null, index: number) {
  const rawName = name?.trim() || `Frame ${index + 1}`;
  const normalized = normalizeMention(rawName).replace(/[^a-z0-9_-]/g, "");
  return `@${normalized || `frame_${index + 1}`}`;
}

function extractMentions(content: string) {
  const mentions = new Set<string>();
  for (const match of content.matchAll(/@([a-zA-Z0-9_-]+)/g)) {
    mentions.add(normalizeMention(match[1]));
  }
  return mentions;
}

function isFrame(
  element: OrderedExcalidrawElement,
): element is OrderedExcalidrawElement & ExcalidrawFrameElement {
  return element.type === "frame";
}

export function collectFrameRefs(
  api: ExcalidrawImperativeAPI | null,
  content: string,
): FrameRef[] {
  if (!api) return [];
  const elements = api.getSceneElements().filter((element) => !element.isDeleted);
  const frames = elements.filter(isFrame);
  const mentions = extractMentions(content);

  const refs = frames.map((frame, index) => {
    const elementIds = elements
      .filter((element) => element.frameId === frame.id)
      .map((element) => element.id);
    return {
      id: frame.id,
      name: frame.name,
      mention: mentionFromName(frame.name, index),
      elementIds,
      bounds: {
        x: frame.x,
        y: frame.y,
        width: frame.width,
        height: frame.height,
      },
    };
  });

  if (mentions.size === 0) return [];
  return refs.filter((ref) => {
    const keys = [
      normalizeMention(ref.mention),
      ref.name ? normalizeMention(ref.name) : "",
    ];
    return keys.some((key) => mentions.has(key));
  });
}

export function formatTimestamp(value: Date | string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function applyProposalChanges(
  api: ExcalidrawImperativeAPI,
  changes: ProposalChange[],
) {
  const { CaptureUpdateAction } = await import("@excalidraw/excalidraw");
  const deleteIds = new Set(
    changes
      .filter((change): change is Extract<ProposalChange, { type: "delete" }> => {
        return change.type === "delete";
      })
      .map((change) => change.elementId),
  );
  const updatePatches = new Map(
    changes
      .filter((change): change is Extract<ProposalChange, { type: "update" }> => {
        return change.type === "update";
      })
      .map((change) => [change.elementId, change.patch]),
  );
  const additions = changes
    .filter((change): change is Extract<ProposalChange, { type: "add" }> => {
      return change.type === "add" && isRecord(change.element);
    })
    .map((change) => change.element as OrderedExcalidrawElement);

  const now = Date.now();
  const elements = api.getSceneElements().map((element) => {
    if (deleteIds.has(element.id)) {
      return { ...element, isDeleted: true, updated: now };
    }

    const patch = updatePatches.get(element.id);
    if (!patch) return element;
    return { ...element, ...patch, updated: now } as OrderedExcalidrawElement;
  });

  api.updateScene({
    elements: [...elements, ...additions],
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
}
