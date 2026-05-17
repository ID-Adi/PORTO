"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { MediaPickerField } from "@/features/admin/components/media-picker-field";
import {
  TextAreaField,
  TextField,
} from "@/features/admin/components/form-field";

type SocialsFormState = {
  label: string;
  href: string;
  detail: string;
  iconUrl: string;
  sortOrder: number;
};

const empty: SocialsFormState = {
  label: "",
  href: "",
  detail: "",
  iconUrl: "",
  sortOrder: 0,
};

export function SocialsForm({
  id,
  initial,
}: {
  id?: number;
  initial?: Partial<SocialsFormState>;
}) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [state, setState] = useState<SocialsFormState>({ ...empty, ...initial });

  const create = trpc.socials.create.useMutation({
    onSuccess: () => {
      toast.success("Social created");
      utils.socials.list.invalidate();
      router.push("/admin/socials");
    },
    onError: (err) => toast.error(err.message),
  });
  const update = trpc.socials.update.useMutation({
    onSuccess: () => {
      toast.success("Social updated");
      utils.socials.list.invalidate();
      router.push("/admin/socials");
    },
    onError: (err) => toast.error(err.message),
  });

  const pending = create.isPending || update.isPending;

  function set<K extends keyof SocialsFormState>(
    key: K,
    value: SocialsFormState[K],
  ) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      label: state.label,
      href: state.href,
      detail: state.detail || null,
      iconUrl: state.iconUrl || null,
      sortOrder: Number(state.sortOrder) || 0,
    };
    if (id) update.mutate({ id, data: payload });
    else create.mutate(payload);
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-2xl gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Label"
          name="label"
          required
          value={state.label}
          onChange={(e) => set("label", e.target.value)}
          placeholder="GitHub"
        />
        <TextField
          label="Sort order"
          name="sortOrder"
          type="number"
          value={state.sortOrder}
          onChange={(e) => set("sortOrder", Number(e.target.value))}
        />
      </div>
      <TextField
        label="Href"
        name="href"
        type="url"
        required
        value={state.href}
        onChange={(e) => set("href", e.target.value)}
        placeholder="https://github.com/your-handle"
      />
      <TextAreaField
        label="Detail"
        name="detail"
        rows={2}
        value={state.detail}
        onChange={(e) => set("detail", e.target.value)}
        hint="Deskripsi pendek (mis. 'Code, experiments, and UI systems')."
      />
      <MediaPickerField
        label="Icon"
        value={state.iconUrl}
        onChange={(v) => set("iconUrl", v)}
        hint="Opsional. Kosongkan untuk pakai brand icon otomatis berdasar label."
      />
      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={pending}
          className="bg-(--primary) text-(--primary-foreground) hover:bg-(--primary)/90"
        >
          {pending ? "Saving…" : id ? "Update social" : "Create social"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/socials")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
