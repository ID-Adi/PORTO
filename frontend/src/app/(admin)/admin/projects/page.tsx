"use client";

import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc";
import { normalizeImageUrl } from "@/lib/image-url";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/features/admin/components/data-table";
import { DeleteButton } from "@/features/admin/components/delete-button";
import { PageHeader } from "@/features/admin/components/page-header";

export default function ProjectsListPage() {
  const utils = trpc.useUtils();
  const list = trpc.projects.list.useQuery();
  const remove = trpc.projects.remove.useMutation({
    onSuccess: () => {
      toast.success("Project deleted");
      utils.projects.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Showcase work shown on the portfolio"
        action={
          <Button
            asChild
            className="bg-(--primary) text-(--primary-foreground) hover:bg-(--primary)/90"
          >
            <Link href="/admin/projects/new">
              <Plus className="size-4" /> New project
            </Link>
          </Button>
        }
      />
      <DataTable
        rows={list.data}
        columns={[
          {
            key: "title",
            header: "Title",
            render: (row) => (
              <div className="flex items-center gap-3">
                {row.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={normalizeImageUrl(row.imageUrl)}
                    alt=""
                    className="size-9 rounded object-cover"
                  />
                ) : (
                  <div className="size-9 rounded bg-(--muted)" />
                )}
                <div>
                  <div className="font-medium">{row.title}</div>
                  <div className="text-xs text-(--muted-foreground)">
                    {row.slug}
                  </div>
                </div>
              </div>
            ),
          },
          {
            key: "period",
            header: "Period",
            render: (row) => row.period ?? "—",
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
                  <Link href={`/admin/projects/${row.id}`}>
                    <Pencil className="size-4" />
                  </Link>
                </Button>
                <DeleteButton
                  label={row.title}
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
