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

export default function BlogListPage() {
  const utils = trpc.useUtils();
  const list = trpc.blog.list.useQuery();
  const remove = trpc.blog.remove.useMutation({
    onSuccess: () => {
      toast.success("Post deleted");
      utils.blog.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div>
      <PageHeader
        title="Blog"
        description="Articles and notes"
        action={
          <Button
            asChild
            className="bg-(--primary) text-(--primary-foreground) hover:bg-(--primary)/90"
          >
            <Link href="/admin/blog/new">
              <Plus className="size-4" /> New post
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
              <div>
                <div className="font-medium">{row.title}</div>
                <div className="text-xs text-(--muted-foreground)">
                  {row.slug}
                </div>
              </div>
            ),
          },
          {
            key: "category",
            header: "Category",
            render: (row) => (
              <span className="border border-(--line) px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-(--muted-foreground)">
                {row.category === "saham_crypto" ? "Saham & Crypto" : "Global"}
              </span>
            ),
          },
          {
            key: "status",
            header: "Status",
            render: (row) =>
              row.published ? (
                <Badge className="bg-(--primary) text-(--primary-foreground)">
                  Published
                </Badge>
              ) : (
                <Badge variant="secondary">Draft</Badge>
              ),
          },
          {
            key: "publishedAt",
            header: "Published at",
            render: (row) =>
              row.publishedAt
                ? new Date(row.publishedAt).toLocaleDateString()
                : "—",
          },
          {
            key: "actions",
            header: "",
            className: "text-right w-32",
            render: (row) => (
              <div className="flex justify-end gap-1">
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/admin/blog/${row.id}`}>
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
