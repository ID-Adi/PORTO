"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  TextAreaField,
  TextField,
} from "@/features/admin/components/form-field";

type SiteSettingsState = {
  profileName: string;
  profileTitle: string;
  logoUrl: string | null;
};

const empty: SiteSettingsState = {
  profileName: "",
  profileTitle: "",
  logoUrl: null,
};

export function SiteSettingsForm() {
  const utils = trpc.useUtils();
  const query = trpc.siteSettings.get.useQuery();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [state, setState] = useState<SiteSettingsState>(empty);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (query.data) {
      setState({
        profileName: query.data.profileName,
        profileTitle: query.data.profileTitle,
        logoUrl: query.data.logoUrl ?? null,
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

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Upload failed");
      }
      set("logoUrl", json.url as string);
      toast.success("Logo uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    update.mutate({
      profileName: state.profileName,
      profileTitle: state.profileTitle,
      logoUrl: state.logoUrl,
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

      <div className="space-y-1.5">
        <Label htmlFor="logo">Header logo</Label>
        <p className="text-xs text-(--muted-foreground)">
          PNG / JPG / SVG / WebP. Max 2MB. Appears to the left of the
          &quot;PORTO /&gt;&quot; brand text.
        </p>
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            id="logo"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
            onChange={handleFileChange}
            disabled={uploading}
            className="block w-full text-sm text-(--muted-foreground) file:mr-3 file:rounded-md file:border file:border-(--border) file:bg-(--muted) file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-(--accent)"
          />
          {state.logoUrl ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => set("logoUrl", null)}
            >
              Remove
            </Button>
          ) : null}
        </div>
        {state.logoUrl ? (
          <div className="mt-2 flex items-center gap-3 rounded-md border border-(--border) bg-(--muted) p-3">
            <Image
              src={state.logoUrl}
              alt="Logo preview"
              width={48}
              height={48}
              className="h-12 w-auto rounded object-contain"
              unoptimized
            />
            <span className="font-mono text-xs text-(--muted-foreground) break-all">
              {state.logoUrl}
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={update.isPending || uploading}
          className="bg-(--primary) text-(--primary-foreground) hover:bg-(--primary)/90"
        >
          {update.isPending ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </form>
  );
}
