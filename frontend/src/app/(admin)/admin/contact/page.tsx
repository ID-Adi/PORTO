"use client";

import Link from "next/link";
import { CheckCircle2, Circle, Eye } from "lucide-react";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/features/admin/components/data-table";
import { DeleteButton } from "@/features/admin/components/delete-button";
import { PageHeader } from "@/features/admin/components/page-header";

export default function ContactListPage() {
  const utils = trpc.useUtils();
  const list = trpc.contact.list.useQuery();
  const markRead = trpc.contact.markRead.useMutation({
    onSuccess: () => utils.contact.list.invalidate(),
    onError: (err) => toast.error(err.message),
  });
  const remove = trpc.contact.remove.useMutation({
    onSuccess: () => {
      toast.success("Message deleted");
      utils.contact.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const unread = list.data?.filter((m) => !m.read).length ?? 0;

  return (
    <div>
      <PageHeader
        title="Contact messages"
        description={
          list.data
            ? `${list.data.length} total · ${unread} unread`
            : "Inbound messages from the contact form"
        }
      />
      <DataTable
        rows={list.data}
        empty="No messages yet."
        columns={[
          {
            key: "status",
            header: "",
            className: "w-10",
            render: (row) =>
              row.read ? (
                <CheckCircle2 className="size-4 text-(--muted-foreground)" />
              ) : (
                <Circle className="size-4 text-(--primary)" />
              ),
          },
          {
            key: "from",
            header: "From",
            render: (row) => (
              <div>
                <div className="font-medium">{row.name}</div>
                <div className="text-xs text-(--muted-foreground)">
                  {row.email}
                </div>
              </div>
            ),
          },
          {
            key: "subject",
            header: "Subject",
            render: (row) => (
              <div className="max-w-[280px]">
                <div className="line-clamp-1">{row.subject ?? "—"}</div>
                <div className="text-xs text-(--muted-foreground) line-clamp-1">
                  {row.message}
                </div>
              </div>
            ),
          },
          {
            key: "received",
            header: "Received",
            render: (row) => (
              <span className="font-mono text-xs">
                {new Date(row.createdAt).toLocaleString()}
              </span>
            ),
          },
          {
            key: "tag",
            header: "",
            render: (row) =>
              row.read ? null : (
                <Badge className="bg-(--primary) text-(--primary-foreground)">
                  New
                </Badge>
              ),
          },
          {
            key: "actions",
            header: "",
            className: "text-right w-40",
            render: (row) => (
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={markRead.isPending}
                  onClick={() =>
                    markRead.mutate({ id: row.id, read: !row.read })
                  }
                  title={row.read ? "Mark as unread" : "Mark as read"}
                >
                  {row.read ? (
                    <Circle className="size-4" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/admin/contact/${row.id}`}>
                    <Eye className="size-4" />
                  </Link>
                </Button>
                <DeleteButton
                  label={`message from ${row.name}`}
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
