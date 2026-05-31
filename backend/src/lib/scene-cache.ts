import Redis from "ioredis";

import type { CanvasAgentSceneData } from "../db/schema/index.js";

// Cache scene canvas di Redis agar load berulang tidak membaca jsonb besar dari
// Postgres. OPSIONAL: tanpa REDIS_URL semua fungsi jadi no-op dan app tetap jalan.
// Kegagalan Redis tidak pernah menggagalkan request — selalu fallback ke DB.

const SCENE_TTL_SECONDS = 60 * 60; // 1 jam

let client: Redis | null = null;
let initialized = false;

function getClient(): Redis | null {
  if (initialized) return client;
  initialized = true;
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    client = null;
    return null;
  }
  client = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
  });
  client.on("error", (error) => {
    console.warn(`[scene-cache] redis error: ${error.message}`);
  });
  // lazyConnect: koneksi dibuka saat command pertama; bungkus agar tidak unhandled.
  client.connect().catch((error) => {
    console.warn(`[scene-cache] redis connect failed: ${error.message}`);
  });
  return client;
}

function sceneKey(workflowId: number) {
  return `canvas:scene:${workflowId}`;
}

export async function getCachedScene(
  workflowId: number,
): Promise<CanvasAgentSceneData | null> {
  const redis = getClient();
  if (!redis) return null;
  try {
    const raw = await redis.get(sceneKey(workflowId));
    if (!raw) return null;
    return JSON.parse(raw) as CanvasAgentSceneData;
  } catch (error) {
    console.warn(
      `[scene-cache] get failed: ${error instanceof Error ? error.message : error}`,
    );
    return null;
  }
}

export async function setCachedScene(
  workflowId: number,
  scene: CanvasAgentSceneData | null | undefined,
): Promise<void> {
  const redis = getClient();
  if (!redis) return;
  try {
    if (scene == null) {
      await redis.del(sceneKey(workflowId));
      return;
    }
    await redis.set(
      sceneKey(workflowId),
      JSON.stringify(scene),
      "EX",
      SCENE_TTL_SECONDS,
    );
  } catch (error) {
    console.warn(
      `[scene-cache] set failed: ${error instanceof Error ? error.message : error}`,
    );
  }
}

export async function invalidateScene(workflowId: number): Promise<void> {
  const redis = getClient();
  if (!redis) return;
  try {
    await redis.del(sceneKey(workflowId));
  } catch (error) {
    console.warn(
      `[scene-cache] invalidate failed: ${error instanceof Error ? error.message : error}`,
    );
  }
}
