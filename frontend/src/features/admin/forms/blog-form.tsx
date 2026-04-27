"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc";
import { normalizeImageUrl } from "@/lib/image-url";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  TextAreaField,
  TextField,
} from "@/features/admin/components/form-field";

type BlogFormState = {
  title: string;
  slug: string;
  description: string;
  content: string;
  meta: string;
  coverUrl: string;
  published: boolean;
  publishedAt: string;
};

const empty: BlogFormState = {
  title: "",
  slug: "",
  description: "",
  content: "",
  meta: "",
  coverUrl: "",
  published: false,
  publishedAt: "",
};

export function BlogForm({
  id,
  initial,
}: {
  id?: number;
  initial?: Partial<BlogFormState>;
}) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [state, setState] = useState<BlogFormState>({ ...empty, ...initial });

  const create = trpc.blog.create.useMutation({
    onSuccess: () => {
      toast.success("Post created");
      utils.blog.list.invalidate();
      router.push("/admin/blog");
    },
    onError: (err) => toast.error(err.message),
  });
  const update = trpc.blog.update.useMutation({
    onSuccess: () => {
      toast.success("Post updated");
      utils.blog.list.invalidate();
      router.push("/admin/blog");
    },
    onError: (err) => toast.error(err.message),
  });

  const pending = create.isPending || update.isPending;

  function set<K extends keyof BlogFormState>(
    key: K,
    value: BlogFormState[K],
  ) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      title: state.title,
      slug: state.slug,
      description: state.description || null,
      content: state.content || null,
      meta: state.meta || null,
      coverUrl: state.coverUrl || null,
      published: state.published,
      publishedAt: state.publishedAt ? new Date(state.publishedAt) : null,
    };
    if (id) update.mutate({ id, data: payload });
    else create.mutate(payload);
  }

  const preview = normalizeImageUrl(state.coverUrl);

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
        />
      </div>
      <TextField
        label="Description"
        name="description"
        value={state.description}
        onChange={(e) => set("description", e.target.value)}
      />
      <TextAreaField
        label="Content (Markdown)"
        name="content"
        rows={12}
        value={state.content}
        onChange={(e) => set("content", e.target.value)}
      />
      <TextField
        label="Meta"
        name="meta"
        value={state.meta}
        onChange={(e) => set("meta", e.target.value)}
        hint="Free-form meta string used in listings."
      />
      <TextField
        label="Cover URL"
        name="coverUrl"
        value={state.coverUrl}
        onChange={(e) => set("coverUrl", e.target.value)}
        hint="Direct image URL or Google Drive share link."
      />
      {preview ? (
        <div className="rounded-md border border-(--border) bg-(--muted) p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt=""
            className="max-h-48 rounded object-contain"
          />
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-md border border-(--border) p-3">
          <div>
            <Label htmlFor="published" className="cursor-pointer">
              Published
            </Label>
            <p className="text-xs text-(--muted-foreground)">
              Visible on the public blog
            </p>
          </div>
          <Switch
            id="published"
            checked={state.published}
            onCheckedChange={(v) => set("published", v)}
          />
        </div>
        <TextField
          label="Published at"
          name="publishedAt"
          type="datetime-local"
          value={state.publishedAt}
          onChange={(e) => set("publishedAt", e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={pending}
          className="bg-(--primary) text-(--primary-foreground) hover:bg-(--primary)/90"
        >
          {pending ? "Saving…" : id ? "Update post" : "Create post"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/blog")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
