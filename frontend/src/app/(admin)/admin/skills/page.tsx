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

export default function SkillsListPage() {
  const utils = trpc.useUtils();
  const list = trpc.skills.list.useQuery();
  const remove = trpc.skills.remove.useMutation({
    onSuccess: () => {
      toast.success("Skill deleted");
      utils.skills.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div>
      <PageHeader
        title="Skills"
        description="Tech and competencies"
        action={
          <Button
            asChild
            className="bg-(--primary) text-(--primary-foreground) hover:bg-(--primary)/90"
          >
            <Link href="/admin/skills/new">
              <Plus className="size-4" /> New skill
            </Link>
          </Button>
        }
      />
      <DataTable
        rows={list.data}
        columns={[
          {
            key: "name",
            header: "Name",
            render: (row) => <div className="font-medium">{row.name}</div>,
          },
          {
            key: "category",
            header: "Category",
            render: (row) => (
              <Badge variant="secondary" className="capitalize">
                {row.category}
              </Badge>
            ),
          },
          {
            key: "level",
            header: "Level",
            render: (row) => <span className="capitalize">{row.level}</span>,
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
                  <Link href={`/admin/skills/${row.id}`}>
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
