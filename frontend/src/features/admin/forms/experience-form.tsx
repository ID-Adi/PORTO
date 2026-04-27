"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  TextAreaField,
  TextField,
} from "@/features/admin/components/form-field";

type ExperienceFormState = {
  period: string;
  title: string;
  detail: string;
  sortOrder: number;
};

const empty: ExperienceFormState = {
  period: "",
  title: "",
  detail: "",
  sortOrder: 0,
};

export function ExperienceForm({
  id,
  initial,
}: {
  id?: number;
  initial?: Partial<ExperienceFormState>;
}) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [state, setState] = useState<ExperienceFormState>({
    ...empty,
    ...initial,
  });

  const create = trpc.experiences.create.useMutation({
    onSuccess: () => {
      toast.success("Experience created");
      utils.experiences.list.invalidate();
      router.push("/admin/experience");
    },
    onError: (err) => toast.error(err.message),
  });
  const update = trpc.experiences.update.useMutation({
    onSuccess: () => {
      toast.success("Experience updated");
      utils.experiences.list.invalidate();
      router.push("/admin/experience");
    },
    onError: (err) => toast.error(err.message),
  });

  const pending = create.isPending || update.isPending;

  function set<K extends keyof ExperienceFormState>(
    key: K,
    value: ExperienceFormState[K],
  ) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      period: state.period,
      title: state.title,
      detail: state.detail || null,
      sortOrder: Number(state.sortOrder) || 0,
    };
    if (id) update.mutate({ id, data: payload });
    else create.mutate(payload);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5 max-w-2xl">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Period"
          name="period"
          required
          value={state.period}
          onChange={(e) => set("period", e.target.value)}
          placeholder="2023 — Present"
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
        label="Title"
        name="title"
        required
        value={state.title}
        onChange={(e) => set("title", e.target.value)}
        placeholder="Frontend Engineer at Acme"
      />
      <TextAreaField
        label="Detail"
        name="detail"
        rows={5}
        value={state.detail}
        onChange={(e) => set("detail", e.target.value)}
      />
      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={pending}
          className="bg-(--primary) text-(--primary-foreground) hover:bg-(--primary)/90"
        >
          {pending
            ? "Saving…"
            : id
              ? "Update experience"
              : "Create experience"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/experience")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
