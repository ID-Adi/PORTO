"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  TextAreaField,
  TextField,
} from "@/features/admin/components/form-field";
import { MediaPickerField } from "@/features/admin/components/media-picker-field";

type SiteSettingsState = {
  profileName: string;
  profileTitle: string;
  logoUrl: string | null;
  avatarUrl: string | null;
};

const empty: SiteSettingsState = {
  profileName: "",
  profileTitle: "",
  logoUrl: null,
  avatarUrl: null,
};

export function SiteSettingsForm() {
  const utils = trpc.useUtils();
  const query = trpc.siteSettings.get.useQuery();
  const [state, setState] = useState<SiteSettingsState>(empty);

  useEffect(() => {
    if (query.data) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({
        profileName: query.data.profileName,
        profileTitle: query.data.profileTitle,
        logoUrl: query.data.logoUrl ?? null,
        avatarUrl: query.data.avatarUrl ?? null,
      });
    }
  }, [query.data]);

  const update = trpc.siteSettings.update.useMutation({
    onSuccess: () => {
      toast.success("Site settings saved");
      utils.siteSettings.get.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  function set<K extends keyof SiteSettingsState>(
    key: K,
    value: SiteSettingsState[K],
  ) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    update.mutate({
      profileName: state.profileName,
      profileTitle: state.profileTitle,
      logoUrl: state.logoUrl,
      avatarUrl: state.avatarUrl,
    });
  }

  if (query.isLoading) {
    return (
      <div className="text-sm text-(--muted-foreground)">Loading…</div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-2xl gap-5">
      <TextField
        label="Profile name"
        name="profileName"
        required
        value={state.profileName}
        onChange={(e) => set("profileName", e.target.value)}
        hint="Displayed as the main name in the homepage hero."
      />
      <TextAreaField
        label="Profile title / tagline"
        name="profileTitle"
        rows={3}
        required
        value={state.profileTitle}
        onChange={(e) => set("profileTitle", e.target.value)}
        hint="Subtitle under the name. Used as fallback when no flip sentences play."
      />

      <MediaPickerField
        label="Profile photo"
        value={state.avatarUrl ?? ""}
        onChange={(v) => set("avatarUrl", v || null)}
        hint="Foto profil yang tampil di hero home (Profile Intro). Square recommended."
      />

      <MediaPickerField
        label="Header logo"
        value={state.logoUrl ?? ""}
        onChange={(v) => set("logoUrl", v || null)}
        hint="PNG/JPG/SVG/WebP, max 2MB. Tampil di kiri brand text di header."
      />

      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={update.isPending}
          className="bg-(--primary) text-(--primary-foreground) hover:bg-(--primary)/90"
        >
          {update.isPending ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </form>
  );
}
