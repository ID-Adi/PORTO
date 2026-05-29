import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../../db/index.js";
import {
  aiToolSettings,
  DEFAULT_TTS_MODEL,
  DEFAULT_TTS_VOICE,
  DEFAULT_TTS_VOICES,
} from "../../db/schema/index.js";
import { encryptSecret } from "../../lib/encrypted-secret.js";
import { protectedProcedure, router } from "../init.js";

const SINGLETON_ID = 1;

type AiToolSettingsRow = typeof aiToolSettings.$inferSelect;

const ttsConfigInput = z.object({
  ttsProvider: z.literal("gemini").default("gemini"),
  ttsModel: z.string().min(1).max(120),
  ttsDefaultVoice: z.string().min(1).max(80),
  ttsVoiceOptions: z.array(z.string().min(1).max(80)).min(1).max(30),
  ttsEnabled: z.boolean(),
  ttsApiKey: z.string().min(8).max(400).optional(),
});

function publicConfig(row: AiToolSettingsRow) {
  return {
    id: row.id,
    ttsProvider: row.ttsProvider,
    ttsModel: row.ttsModel,
    ttsDefaultVoice: row.ttsDefaultVoice,
    ttsVoiceOptions: row.ttsVoiceOptions,
    ttsEnabled: row.ttsEnabled,
    ttsApiKeyLast4: row.ttsApiKeyLast4,
    hasTtsApiKey: Boolean(row.ttsApiKeyEncrypted),
    updatedAt: row.updatedAt,
  };
}

async function getOrCreateSettings() {
  const [existing] = await db
    .select()
    .from(aiToolSettings)
    .where(eq(aiToolSettings.id, SINGLETON_ID))
    .limit(1);

  if (existing) return existing;

  const [row] = await db
    .insert(aiToolSettings)
    .values({
      id: SINGLETON_ID,
      ttsProvider: "gemini",
      ttsModel: DEFAULT_TTS_MODEL,
      ttsDefaultVoice: DEFAULT_TTS_VOICE,
      ttsVoiceOptions: [...DEFAULT_TTS_VOICES],
      ttsEnabled: false,
    })
    .returning();
  return row;
}

export const aiSettingsRouter = router({
  getTtsConfig: protectedProcedure.query(async () => {
    return publicConfig(await getOrCreateSettings());
  }),

  updateTtsConfig: protectedProcedure
    .input(ttsConfigInput)
    .mutation(async ({ input }) => {
      const existing = await getOrCreateSettings();
      const apiKeyPatch =
        input.ttsApiKey && input.ttsApiKey.trim()
          ? {
              ttsApiKeyEncrypted: encryptSecret(input.ttsApiKey.trim()),
              ttsApiKeyLast4: input.ttsApiKey.trim().slice(-4),
            }
          : {};

      const [row] = await db
        .update(aiToolSettings)
        .set({
          ttsProvider: input.ttsProvider,
          ttsModel: input.ttsModel,
          ttsDefaultVoice: input.ttsDefaultVoice,
          ttsVoiceOptions: input.ttsVoiceOptions,
          ttsEnabled: input.ttsEnabled,
          ...apiKeyPatch,
          updatedAt: new Date(),
        })
        .where(eq(aiToolSettings.id, existing.id))
        .returning();

      return publicConfig(row);
    }),
});
