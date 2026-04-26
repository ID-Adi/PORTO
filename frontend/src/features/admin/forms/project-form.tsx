"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc";
import { normalizeImageUrl } from "@/lib/image-url";
import { Button } from "@/components/ui/button";
import {
  TextAreaField,
  TextField,
} from "@/features/admin/components/form-field";

type ProjectFormState = {
  title: string;
  slug: string;
  description: string;
  detail: string;
  period: string;
  imageUrl: string;
  url: string;
  repoUrl: string;
  sortOrder: number;
};

const empty: ProjectFormState = {
  title: "",
  slug: "",
  description: "",
  detail: "",
  period: "",
  imageUrl: "",
  url: "",
  repoUrl: "",
  sortOrder: 0,
};

export function ProjectForm({
  id,
  initial,
}: {
  id?: number;
  initial?: Partial<ProjectFormState>;
}) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [state, setState] = useState<ProjectFormState>({ ...empty, ...initial });

  useEffect(() => {
    if (initial) setState((s) => ({ ...s, ...initial }));
  }, [initial]);

  const create = trpc.projects.create.useMutation({
    onSuccess: () => {
      toast.success("Project created");
      utils.projects.list.invalidate();
      router.push("/admin/projects");
    },
    onError: (err) => toast.error(err.message),
  });
  const update = trpc.projects.update.useMutation({
    onSuccess: () => {
      toast.success("Project updated");
      utils.projects.list.invalidate();
      router.push("/admin/projects");
    },
    onError: (err) => toast.error(err.message),
  });

  const pending = create.isPending || update.isPending;

  function set<K extends keyof ProjectFormState>(
    key: K,
    value: ProjectFormState[K],
  ) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      title: state.title,
      slug: state.slug,
      description: state.description || null,
      detail: state.detail || null,
      period: state.period || null,
      imageUrl: state.imageUrl || null,
      url: state.url || null,
      repoUrl: state.repoUrl || null,
      sortOrder: Number(state.sortOrder) || 0,
    };
    if (id) update.mutate({ id, data: payload });
    else create.mutate(payload);
  }

  const preview = normalizeImageUrl(state.imageUrl);

  return (
    <form onSubmit={onSubmit} className="grid gap-5 max-w-2xl">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Title"
          name="title"
          required
          value={state.title}
          onChange={(e) => set("title", e.target.value)}
        />
        <TextField
          label="Slug"
          name="slug"
          required
          value={state.slug}
          onChange={(e) => set("slug", e.target.value)}
          hint="URL-friendly id, e.g. portfolio-v2"
        />
      </div>
      <TextField
        label="Description"
        name="description"
        value={state.description}
        onChange={(e) => set("description", e.target.value)}
      />
      <TextAreaField
        label="Detail"
        name="detail"
        rows={5}
        value={state.detail}
        onChange={(e) => set("detail", e.target.value)}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Period"
          name="period"
          value={state.period}
          onChange={(e) => set("period", e.target.value)}
          placeholder="2024 — 2025"
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
        label="Image URL"
        name="imageUrl"
        value={state.imageUrl}
        onChange={(e) => set("imageUrl", e.target.value)}
        hint="Paste a direct image URL or a Google Drive share link (auto-converted)."
      />
      {preview ? (
        <div className="rounded-md border border-(--border) bg-(--muted) p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="preview"
            className="max-h-48 rounded object-contain"
          />
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Live URL"
          name="url"
          value={state.url}
          onChange={(e) => set("url", e.target.value)}
        />
        <TextField
          label="Repository URL"
          name="repoUrl"
          value={state.repoUrl}
          onChange={(e) => set("repoUrl", e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={pending}
          className="bg-(--primary) text-(--primary-foreground) hover:bg-(--primary)/90"
        >
          {pending ? "Saving…" : id ? "Update project" : "Create project"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/projects")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
