"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  TextAreaField,
  TextField,
} from "@/features/admin/components/form-field";
import { MediaPickerField } from "@/features/admin/components/media-picker-field";

type PositionState = {
  title: string;
  employmentType: string;
  period: string;
  description: string;
  achievements: string;
  technologies: string;
  sortOrder: number;
};

type ExperienceFormState = {
  name: string;
  website: string;
  location: string;
  logoUrl: string;
  isCurrent: boolean;
  sortOrder: number;
  positions: PositionState[];
};

const emptyPosition: PositionState = {
  title: "",
  employmentType: "",
  period: "",
  description: "",
  achievements: "",
  technologies: "",
  sortOrder: 0,
};

const empty: ExperienceFormState = {
  name: "",
  website: "",
  location: "",
  logoUrl: "",
  isCurrent: false,
  sortOrder: 0,
  positions: [{ ...emptyPosition }],
};

function splitLines(s: string) {
  return s
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
}
function splitCsv(s: string) {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

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
    positions: initial?.positions?.length
      ? initial.positions
      : [{ ...emptyPosition }],
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

  function updatePosition(index: number, patch: Partial<PositionState>) {
    setState((s) => ({
      ...s,
      positions: s.positions.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    }));
  }

  function addPosition() {
    setState((s) => ({
      ...s,
      positions: [...s.positions, { ...emptyPosition, sortOrder: s.positions.length * 10 }],
    }));
  }

  function removePosition(index: number) {
    setState((s) => ({
      ...s,
      positions: s.positions.filter((_, i) => i !== index),
    }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: state.name,
      website: state.website || null,
      location: state.location || null,
      logoUrl: state.logoUrl || null,
      isCurrent: state.isCurrent,
      sortOrder: Number(state.sortOrder) || 0,
      positions: state.positions.map((p, i) => ({
        title: p.title,
        employmentType: p.employmentType || null,
        period: p.period || null,
        description: p.description || null,
        achievements: splitLines(p.achievements),
        technologies: splitCsv(p.technologies),
        sortOrder: Number(p.sortOrder) || i * 10,
      })),
    };
    if (id) update.mutate({ id, data: payload });
    else create.mutate(payload);
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-3xl gap-6">
      <fieldset className="grid gap-4 border border-(--line) p-4">
        <legend className="px-2 font-mono text-[11px] uppercase tracking-[0.14em] text-(--muted-foreground)">
          Company
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Company name"
            name="name"
            required
            value={state.name}
            onChange={(e) => set("name", e.target.value)}
          />
          <TextField
            label="Location"
            name="location"
            value={state.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="Jakarta, Indonesia"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Website"
            name="website"
            type="url"
            value={state.website}
            onChange={(e) => set("website", e.target.value)}
          />
          <TextField
            label="Sort order"
            name="sortOrder"
            type="number"
            value={state.sortOrder}
            onChange={(e) => set("sortOrder", Number(e.target.value))}
          />
        </div>
        <MediaPickerField
          label="Logo"
          value={state.logoUrl}
          onChange={(v) => set("logoUrl", v)}
        />
        <div className="flex items-center justify-between border border-(--border) p-3">
          <div>
            <Label htmlFor="isCurrent" className="cursor-pointer">
              Current employer
            </Label>
            <p className="text-xs text-(--muted-foreground)">
              Tandai sebagai pekerjaan saat ini.
            </p>
          </div>
          <Switch
            id="isCurrent"
            checked={state.isCurrent}
            onCheckedChange={(v) => set("isCurrent", v)}
          />
        </div>
      </fieldset>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.14em] text-(--muted-foreground)">
            Positions ({state.positions.length})
          </h3>
          <Button type="button" variant="outline" size="sm" onClick={addPosition}>
            <Plus className="size-4" /> Add position
          </Button>
        </div>

        {state.positions.map((pos, index) => (
          <fieldset
            key={index}
            className="relative grid gap-4 border border-(--line) p-4"
          >
            <legend className="px-2 font-mono text-[11px] uppercase tracking-[0.14em] text-(--muted-foreground)">
              Position {index + 1}
            </legend>
            {state.positions.length > 1 ? (
              <button
                type="button"
                onClick={() => removePosition(index)}
                className="absolute top-2 right-2 inline-flex size-7 items-center justify-center text-(--muted-foreground) hover:text-(--destructive)"
                aria-label="Remove position"
              >
                <Trash2 className="size-4" />
              </button>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Title"
                name={`title-${index}`}
                required
                value={pos.title}
                onChange={(e) => updatePosition(index, { title: e.target.value })}
                placeholder="Senior Frontend Engineer"
              />
              <TextField
                label="Period"
                name={`period-${index}`}
                value={pos.period}
                onChange={(e) => updatePosition(index, { period: e.target.value })}
                placeholder="2022 – 2024"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Employment type"
                name={`employmentType-${index}`}
                value={pos.employmentType}
                onChange={(e) =>
                  updatePosition(index, { employmentType: e.target.value })
                }
                placeholder="Full-time, Contract, …"
              />
              <TextField
                label="Sort order"
                name={`positionSortOrder-${index}`}
                type="number"
                value={pos.sortOrder}
                onChange={(e) =>
                  updatePosition(index, { sortOrder: Number(e.target.value) })
                }
              />
            </div>
            <TextAreaField
              label="Description"
              name={`description-${index}`}
              rows={3}
              value={pos.description}
              onChange={(e) =>
                updatePosition(index, { description: e.target.value })
              }
            />
            <TextAreaField
              label="Achievements"
              name={`achievements-${index}`}
              rows={4}
              value={pos.achievements}
              onChange={(e) =>
                updatePosition(index, { achievements: e.target.value })
              }
              hint="Satu bullet per baris."
            />
            <TextField
              label="Technologies"
              name={`technologies-${index}`}
              value={pos.technologies}
              onChange={(e) =>
                updatePosition(index, { technologies: e.target.value })
              }
              hint="Pisahkan dengan koma."
            />
          </fieldset>
        ))}
      </div>

      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={pending}
          className="bg-(--primary) text-(--primary-foreground) hover:bg-(--primary)/90"
        >
          {pending ? "Saving…" : id ? "Update experience" : "Create experience"}
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
