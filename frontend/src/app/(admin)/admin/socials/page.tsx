"use client";

import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/features/admin/components/data-table";
import { DeleteButton } from "@/features/admin/components/delete-button";
import { PageHeader } from "@/features/admin/components/page-header";

export default function SocialsListPage() {
  const utils = trpc.useUtils();
  const list = trpc.socials.list.useQuery();
  const remove = trpc.socials.remove.useMutation({
    onSuccess: () => {
      toast.success("Social deleted");
      utils.socials.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div>
      <PageHeader
        title="Socials"
        description="Maksimum 6 card ditampilkan di home (kelebihan diabaikan, kekurangan dipad sebagai card arsir)."
        action={
          <Button
            asChild
            className="bg-(--primary) text-(--primary-foreground) hover:bg-(--primary)/90"
          >
            <Link href="/admin/socials/new">
              <Plus className="size-4" /> New social
            </Link>
          </Button>
        }
      />
      <DataTable
        rows={list.data}
        columns={[
          {
            key: "icon",
            header: "",
            className: "w-12",
            render: (row) =>
              row.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={row.iconUrl}
                  alt=""
                  className="size-8 border border-(--line) object-contain"
                />
              ) : (
                <div className="size-8 border border-dashed border-(--line) bg-(--muted)/40" />
              ),
          },
          {
            key: "label",
            header: "Label",
            render: (row) => <div className="font-medium">{row.label}</div>,
          },
          {
            key: "href",
            header: "Href",
            render: (row) => (
              <a
                href={row.href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-(--muted-foreground) underline-offset-2 hover:underline"
              >
                {row.href}
              </a>
            ),
          },
          {
            key: "detail",
            header: "Detail",
            render: (row) => (
              <span className="line-clamp-1 text-xs text-(--muted-foreground)">
                {row.detail ?? "—"}
              </span>
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
                  <Link href={`/admin/socials/${row.id}`}>
                    <Pencil className="size-4" />
                  </Link>
                </Button>
                <DeleteButton
                  label={row.label}
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
