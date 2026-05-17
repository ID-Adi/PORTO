"use client";

import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/features/admin/components/data-table";
import { DeleteButton } from "@/features/admin/components/delete-button";
import { PageHeader } from "@/features/admin/components/page-header";

export default function OverviewListPage() {
  const utils = trpc.useUtils();
  const list = trpc.profileOverview.list.useQuery();
  const remove = trpc.profileOverview.remove.useMutation({
    onSuccess: () => {
      toast.success("Row deleted");
      utils.profileOverview.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Baris info di hero home (Design Engineer, Founder, lokasi, kontak, dll)."
        action={
          <Button
            asChild
            className="bg-(--primary) text-(--primary-foreground) hover:bg-(--primary)/90"
          >
            <Link href="/admin/overview/new">
              <Plus className="size-4" /> New row
            </Link>
          </Button>
        }
      />
      <DataTable
        rows={list.data}
        columns={[
          {
            key: "position",
            header: "Position",
            render: (row) => (
              <Badge variant="secondary" className="capitalize">
                {row.position}
              </Badge>
            ),
          },
          {
            key: "icon",
            header: "Icon",
            render: (row) => (
              <span className="font-mono text-xs">{row.icon}</span>
            ),
          },
          {
            key: "value",
            header: "Value",
            render: (row) => (
              <div>
                <div className="font-medium">{row.value}</div>
                {row.kind === "time" ? (
                  <div className="font-mono text-[10px] text-(--muted-foreground)">
                    TIME · {row.note ?? ""}
                  </div>
                ) : null}
              </div>
            ),
          },
          {
            key: "copyable",
            header: "Copy",
            render: (row) =>
              row.copyable ? (
                <span className="font-mono text-[10px] uppercase tracking-wider">YES</span>
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
                  <Link href={`/admin/overview/${row.id}`}>
                    <Pencil className="size-4" />
                  </Link>
                </Button>
                <DeleteButton
                  label={row.value}
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
