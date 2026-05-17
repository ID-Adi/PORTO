"use client";

import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/features/admin/components/data-table";
import { DeleteButton } from "@/features/admin/components/delete-button";
import { PageHeader } from "@/features/admin/components/page-header";

export default function ExperienceListPage() {
  const utils = trpc.useUtils();
  const list = trpc.experiences.list.useQuery();
  const remove = trpc.experiences.remove.useMutation({
    onSuccess: () => {
      toast.success("Company deleted");
      utils.experiences.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div>
      <PageHeader
        title="Experience"
        description="Work history shown on the portfolio"
        action={
          <Button
            asChild
            className="bg-(--primary) text-(--primary-foreground) hover:bg-(--primary)/90"
          >
            <Link href="/admin/experience/new">
              <Plus className="size-4" /> New company
            </Link>
          </Button>
        }
      />
      <DataTable
        rows={list.data}
        columns={[
          {
            key: "name",
            header: "Company",
            render: (row) => (
              <div>
                <div className="font-medium">{row.name}</div>
                {row.location ? (
                  <div className="text-xs text-(--muted-foreground)">{row.location}</div>
                ) : null}
              </div>
            ),
          },
          {
            key: "positions",
            header: "Positions",
            render: (row) => (
              <div className="space-y-0.5">
                {row.positions.map((p) => (
                  <div key={p.id} className="text-xs">
                    <span className="font-medium">{p.title}</span>
                    {p.period ? (
                      <span className="text-(--muted-foreground)"> · {p.period}</span>
                    ) : null}
                  </div>
                ))}
                {row.positions.length === 0 ? (
                  <span className="text-xs italic text-(--muted-foreground)">No positions</span>
                ) : null}
              </div>
            ),
          },
          {
            key: "current",
            header: "Current",
            render: (row) =>
              row.isCurrent ? (
                <span className="font-mono text-[10px] uppercase tracking-wider text-(--foreground)">YES</span>
              ) : (
                <span className="text-(--muted-foreground)">—</span>
              ),
          },
          {
            key: "sort",
            header: "Sort",
            render: (row) => row.sortOrder,
          },
          {
            key: "actions",
            header: "",
            className: "text-right w-32",
            render: (row) => (
              <div className="flex justify-end gap-1">
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/admin/experience/${row.id}`}>
                    <Pencil className="size-4" />
                  </Link>
                </Button>
                <DeleteButton
                  label={row.name}
                  onConfirm={() => remove.mutate({ id: row.id })}
                  pending={remove.isPending}
                />
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
