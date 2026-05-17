"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc";
import { MediaPickerField } from "@/features/admin/components/media-picker-field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TextAreaField,
  TextField,
} from "@/features/admin/components/form-field";

type SkillFormState = {
  name: string;
  category: string;
  level: number;
  description: string;
  years: number | "";
  iconUrl: string;
  sortOrder: number;
};

const empty: SkillFormState = {
  name: "",
  category: "other",
  level: 3,
  description: "",
  years: "",
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
      level: Math.min(5, Math.max(1, Number(state.level) || 3)),
      description: state.description || null,
      years: state.years === "" ? null : Number(state.years),
      iconUrl: state.iconUrl || null,
      sortOrder: Number(state.sortOrder) || 0,
    };
    if (id) update.mutate({ id, data: payload });
    else create.mutate(payload);
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-2xl gap-5">
      <TextField
        label="Name"
        name="name"
        required
        value={state.name}
        onChange={(e) => set("name", e.target.value)}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="category">Category</Label>
          <Select
            value={state.category}
            onValueChange={(v) => set("category", v)}
          >
            <SelectTrigger id="category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="frontend">Frontend</SelectItem>
              <SelectItem value="backend">Backend</SelectItem>
              <SelectItem value="devops">DevOps &amp; Cloud</SelectItem>
              <SelectItem value="tools">Tools &amp; Workflow</SelectItem>
              <SelectItem value="architecture">Architecture &amp; Patterns</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <TextField
          label="Level (1-5)"
          name="level"
          type="number"
          min={1}
          max={5}
          value={state.level}
          onChange={(e) => set("level", Number(e.target.value))}
        />
        <TextField
          label="Years"
          name="years"
          type="number"
          min={0}
          value={state.years}
          onChange={(e) =>
            set("years", e.target.value === "" ? "" : Number(e.target.value))
          }
        />
      </div>
      <TextAreaField
        label="Description"
        name="description"
        rows={3}
        value={state.description}
        onChange={(e) => set("description", e.target.value)}
        hint="Singkat: stack/area/penekanan apa yang dikuasai."
      />
      <MediaPickerField
        label="Icon"
        value={state.iconUrl}
        onChange={(v) => set("iconUrl", v)}
        hint="Pilih dari library, upload baru, atau paste URL."
      />
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
