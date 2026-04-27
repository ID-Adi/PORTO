"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc";
import { normalizeImageUrl } from "@/lib/image-url";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TextField } from "@/features/admin/components/form-field";

type Category = "frontend" | "backend" | "tooling" | "other";
type Level = "beginner" | "intermediate" | "advanced" | "expert";

type SkillFormState = {
  name: string;
  category: Category;
  level: Level;
  iconUrl: string;
  sortOrder: number;
};

const empty: SkillFormState = {
  name: "",
  category: "other",
  level: "intermediate",
  iconUrl: "",
  sortOrder: 0,
};

export function SkillForm({
  id,
  initial,
}: {
  id?: number;
  initial?: Partial<SkillFormState>;
}) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [state, setState] = useState<SkillFormState>({ ...empty, ...initial });

  const create = trpc.skills.create.useMutation({
    onSuccess: () => {
      toast.success("Skill created");
      utils.skills.list.invalidate();
      router.push("/admin/skills");
    },
    onError: (err) => toast.error(err.message),
  });
  const update = trpc.skills.update.useMutation({
    onSuccess: () => {
      toast.success("Skill updated");
      utils.skills.list.invalidate();
      router.push("/admin/skills");
    },
    onError: (err) => toast.error(err.message),
  });

  const pending = create.isPending || update.isPending;

  function set<K extends keyof SkillFormState>(
    key: K,
    value: SkillFormState[K],
  ) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: state.name,
      category: state.category,
      level: state.level,
      iconUrl: state.iconUrl || null,
      sortOrder: Number(state.sortOrder) || 0,
    };
    if (id) update.mutate({ id, data: payload });
    else create.mutate(payload);
  }

  const preview = normalizeImageUrl(state.iconUrl);

  return (
    <form onSubmit={onSubmit} className="grid gap-5 max-w-2xl">
      <TextField
        label="Name"
        name="name"
        required
        value={state.name}
        onChange={(e) => set("name", e.target.value)}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="category">Category</Label>
          <Select
            value={state.category}
            onValueChange={(v) => set("category", v as Category)}
          >
            <SelectTrigger id="category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="frontend">Frontend</SelectItem>
              <SelectItem value="backend">Backend</SelectItem>
              <SelectItem value="tooling">Tooling</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="level">Level</Label>
          <Select
            value={state.level}
            onValueChange={(v) => set("level", v as Level)}
          >
            <SelectTrigger id="level">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
              <SelectItem value="expert">Expert</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <TextField
        label="Icon URL"
        name="iconUrl"
        value={state.iconUrl}
        onChange={(e) => set("iconUrl", e.target.value)}
        hint="Optional. Direct image URL or Google Drive share link."
      />
      {preview ? (
        <div className="rounded-md border border-(--border) bg-(--muted) p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="size-12 object-contain" />
        </div>
      ) : null}
      <TextField
        label="Sort order"
        name="sortOrder"
        type="number"
        value={state.sortOrder}
        onChange={(e) => set("sortOrder", Number(e.target.value))}
      />
      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={pending}
          className="bg-(--primary) text-(--primary-foreground) hover:bg-(--primary)/90"
        >
          {pending ? "Saving…" : id ? "Update skill" : "Create skill"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/skills")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
