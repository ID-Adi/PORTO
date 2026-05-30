"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { ApiKeyField } from "@/features/admin/components/api-key-field";
import {
  Field,
  TextAreaField,
  TextField,
} from "@/features/admin/components/form-field";

type AiSettingsState = {
  ttsModel: string;
  ttsDefaultVoice: string;
  ttsVoiceOptionsText: string;
  ttsEnabled: boolean;
};

const empty: AiSettingsState = {
  ttsModel: "",
  ttsDefaultVoice: "",
  ttsVoiceOptionsText: "",
  ttsEnabled: false,
};

function parseVoiceOptions(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

export function AiSettingsForm() {
  const utils = trpc.useUtils();
  const query = trpc.aiSettings.getTtsConfig.useQuery();
  const [state, setState] = useState<AiSettingsState>(empty);

  useEffect(() => {
    if (!query.data) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({
      ttsModel: query.data.ttsModel,
      ttsDefaultVoice: query.data.ttsDefaultVoice,
      ttsVoiceOptionsText: query.data.ttsVoiceOptions.join("\n"),
      ttsEnabled: query.data.ttsEnabled,
    });
  }, [query.data]);

  const update = trpc.aiSettings.updateTtsConfig.useMutation({
    onSuccess: () => {
      toast.success("AI settings saved");
      setState((prev) => ({ ...prev, ttsApiKey: "" }));
      utils.aiSettings.getTtsConfig.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  function set<K extends keyof AiSettingsState>(
    key: K,
    value: AiSettingsState[K],
  ) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const voiceOptions = parseVoiceOptions(state.ttsVoiceOptionsText);
    if (!voiceOptions.includes(state.ttsDefaultVoice.trim())) {
      voiceOptions.unshift(state.ttsDefaultVoice.trim());
    }

    update.mutate({
      ttsProvider: "gemini",
      ttsModel: state.ttsModel.trim(),
      ttsDefaultVoice: state.ttsDefaultVoice.trim(),
      ttsVoiceOptions: voiceOptions,
      ttsEnabled: state.ttsEnabled,
    });
  }

  if (query.isLoading) {
    return (
      <div className="text-sm text-(--muted-foreground)">Loading...</div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-2xl gap-5">
      <div className="border border-(--line) p-4">
        <Field
          label="Enable TTS"
          htmlFor="ttsEnabled"
          hint="When disabled, users can see the TTS tab but generation is blocked."
        >
          <div className="flex items-center gap-3">
            <Switch
              id="ttsEnabled"
              checked={state.ttsEnabled}
              onCheckedChange={(checked) => set("ttsEnabled", checked)}
            />
            <span className="font-mono text-[11px] tracking-[0.16em] text-(--muted-foreground) uppercase">
              {state.ttsEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>
        </Field>
      </div>

      <TextField
        label="Default TTS model"
        name="ttsModel"
        required
        value={state.ttsModel}
        onChange={(event) => set("ttsModel", event.target.value)}
        hint="Model default; user bisa memilih model lain di /tools (daftar live per provider)."
      />

      <div className="grid gap-4 border border-(--line) p-4">
        <p className="font-mono text-[11px] tracking-[0.16em] text-(--muted-foreground) uppercase">
          Provider credentials
        </p>
        {query.data ? (
          <>
            <ApiKeyField
              provider="gemini"
              label="Gemini API key"
              hint="Google AI Studio key (generativelanguage)."
              status={query.data.gemini}
            />
            <ApiKeyField
              provider="vertex"
              label="Vertex AI (Service Account)"
              hint="Service Account JSON + Project ID + Location."
              status={query.data.vertex}
            />
            <ApiKeyField
              provider="openrouter"
              label="OpenRouter API key"
              hint="Bearer key dari openrouter.ai."
              status={query.data.openrouter}
            />
          </>
        ) : null}
      </div>

      <TextField
        label="Default voice"
        name="ttsDefaultVoice"
        required
        value={state.ttsDefaultVoice}
        onChange={(event) => set("ttsDefaultVoice", event.target.value)}
        hint="Must be one of the allowed voices below."
      />

      <TextAreaField
        label="Allowed voices"
        name="ttsVoiceOptions"
        rows={7}
        required
        value={state.ttsVoiceOptionsText}
        onChange={(event) => set("ttsVoiceOptionsText", event.target.value)}
        hint="One voice per line. These names are sent to Gemini prebuiltVoiceConfig."
      />

      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={update.isPending}
          className="bg-(--primary) text-(--primary-foreground) hover:bg-(--primary)/90"
        >
          {update.isPending ? "Saving..." : "Save AI settings"}
        </Button>
      </div>
    </form>
  );
}
