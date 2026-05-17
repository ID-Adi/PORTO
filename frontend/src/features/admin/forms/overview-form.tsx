"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Clock,
  Code,
  Lightbulb,
  Link2,
  Mail,
  MapPin,
  Phone,
  User,
} from "lucide-react";

import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TextField } from "@/features/admin/components/form-field";

type Position = "lead" | "left" | "right";
type Kind = "text" | "time";

type OverviewFormState = {
  position: Position;
  icon: string;
  value: string;
  kind: Kind;
  copyable: boolean;
  note: string;
  sortOrder: number;
};

const empty: OverviewFormState = {
  position: "left",
  icon: "code",
  value: "",
  kind: "text",
  copyable: false,
  note: "",
  sortOrder: 0,
};

const ICONS = [
  { key: "code", label: "Code", Icon: Code },
  { key: "lightbulb", label: "Lightbulb", Icon: Lightbulb },
  { key: "mapPin", label: "Map pin", Icon: MapPin },
  { key: "clock", label: "Clock", Icon: Clock },
  { key: "phone", label: "Phone", Icon: Phone },
  { key: "mail", label: "Mail", Icon: Mail },
  { key: "link", label: "Link", Icon: Link2 },
  { key: "user", label: "User", Icon: User },
];

export function OverviewForm({
  id,
  initial,
}: {
  id?: number;
  initial?: Partial<OverviewFormState>;
}) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [state, setState] = useState<OverviewFormState>({ ...empty, ...initial });

  const create = trpc.profileOverview.create.useMutation({
    onSuccess: () => {
      toast.success("Overview row created");
      utils.profileOverview.list.invalidate();
      router.push("/admin/overview");
    },
    onError: (err) => toast.error(err.message),
  });
  const update = trpc.profileOverview.update.useMutation({
    onSuccess: () => {
      toast.success("Overview row updated");
      utils.profileOverview.list.invalidate();
      router.push("/admin/overview");
    },
    onError: (err) => toast.error(err.message),
  });

  const pending = create.isPending || update.isPending;

  function set<K extends keyof OverviewFormState>(
    key: K,
    value: OverviewFormState[K],
  ) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      position: state.position,
      icon: state.icon,
      value: state.value,
      kind: state.kind,
      copyable: state.copyable,
      note: state.note || null,
      sortOrder: Number(state.sortOrder) || 0,
    };
    if (id) update.mutate({ id, data: payload });
    else create.mutate(payload);
  }

  const selectedIcon = ICONS.find((i) => i.key === state.icon);
  const SelectedIconComp = selectedIcon?.Icon ?? Code;

  return (
    <form onSubmit={onSubmit} className="grid max-w-2xl gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="position">Position</Label>
          <Select
            value={state.position}
            onValueChange={(v) => set("position", v as Position)}
          >
            <SelectTrigger id="position">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lead">Lead (full row)</SelectItem>
              <SelectItem value="left">Left column</SelectItem>
              <SelectItem value="right">Right column</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="icon">Icon</Label>
          <Select value={state.icon} onValueChange={(v) => set("icon", v)}>
            <SelectTrigger id="icon">
              <SelectValue>
                <span className="inline-flex items-center gap-2">
                  <SelectedIconComp className="size-4" />
                  {selectedIcon?.label}
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {ICONS.map(({ key, label, Icon }) => (
                <SelectItem key={key} value={key}>
                  <span className="inline-flex items-center gap-2">
                    <Icon className="size-4" />
                    {label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="kind">Kind</Label>
          <Select
            value={state.kind}
            onValueChange={(v) => set("kind", v as Kind)}
          >
            <SelectTrigger id="kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="time">Time (live clock)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <TextField
        label="Value"
        name="value"
        required
        value={state.value}
        onChange={(e) => set("value", e.target.value)}
        hint={
          state.kind === "time"
            ? "Isi IANA timezone (mis. Asia/Makassar, Europe/Berlin)."
            : undefined
        }
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Note"
          name="note"
          value={state.note}
          onChange={(e) => set("note", e.target.value)}
          hint="Opsional (mis. label timezone 'WITA')."
        />
        <TextField
          label="Sort order"
          name="sortOrder"
          type="number"
          value={state.sortOrder}
          onChange={(e) => set("sortOrder", Number(e.target.value))}
        />
      </div>
      <div className="flex items-center justify-between border border-(--border) p-3">
        <div>
          <Label htmlFor="copyable" className="cursor-pointer">
            Copyable
          </Label>
          <p className="text-xs text-(--muted-foreground)">
            Tampilkan tombol copy di samping value (cocok untuk phone/mail).
          </p>
        </div>
        <Switch
          id="copyable"
          checked={state.copyable}
          onCheckedChange={(v) => set("copyable", v)}
        />
      </div>
      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={pending}
          className="bg-(--primary) text-(--primary-foreground) hover:bg-(--primary)/90"
        >
          {pending ? "Saving…" : id ? "Update row" : "Create row"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/overview")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
