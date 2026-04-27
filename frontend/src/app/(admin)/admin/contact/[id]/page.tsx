"use client";

import { use, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/features/admin/components/delete-button";
import { PageHeader } from "@/features/admin/components/page-header";

export default function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const numericId = Number(id);
  const router = useRouter();
  const utils = trpc.useUtils();
  const query = trpc.contact.byId.useQuery({ id: numericId });
  const markRead = trpc.contact.markRead.useMutation({
    onSuccess: () => {
      utils.contact.list.invalidate();
      utils.contact.byId.invalidate({ id: numericId });
    },
  });
  const remove = trpc.contact.remove.useMutation({
    onSuccess: () => {
      toast.success("Message deleted");
      utils.contact.list.invalidate();
      router.push("/admin/contact");
    },
    onError: (err) => toast.error(err.message),
  });

  // Auto mark-read when opening an unread message.
  useEffect(() => {
    if (query.data && !query.data.read && !markRead.isPending) {
      markRead.mutate({ id: numericId, read: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data?.id]);

  return (
    <div>
      <PageHeader
        title="Message"
        action={
          <Button asChild variant="outline">
            <Link href="/admin/contact">
              <ArrowLeft className="size-4" /> Back
            </Link>
          </Button>
        }
      />
      {query.isLoading ? (
        <div className="text-sm text-(--muted-foreground)">Loading…</div>
      ) : !query.data ? (
        <div className="text-sm text-(--destructive)">Message not found.</div>
      ) : (
        <div className="max-w-2xl space-y-4 rounded-md border border-(--border) bg-(--card) p-6">
          <div className="grid gap-1">
            <div className="text-xs uppercase tracking-wide text-(--muted-foreground)">
              From
            </div>
            <div className="font-medium">
              {query.data.name}{" "}
              <span className="text-(--muted-foreground)">
                &lt;{query.data.email}&gt;
              </span>
            </div>
          </div>
          <div className="grid gap-1">
            <div className="text-xs uppercase tracking-wide text-(--muted-foreground)">
              Subject
            </div>
            <div>{query.data.subject ?? "—"}</div>
          </div>
          <div className="grid gap-1">
            <div className="text-xs uppercase tracking-wide text-(--muted-foreground)">
              Received
            </div>
            <div className="font-mono text-xs">
              {new Date(query.data.createdAt).toLocaleString()}
            </div>
          </div>
          <div className="grid gap-1">
            <div className="text-xs uppercase tracking-wide text-(--muted-foreground)">
              Message
            </div>
            <div className="whitespace-pre-wrap rounded-md border border-(--border) bg-(--muted) p-3 text-sm">
              {query.data.message}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() =>
                markRead.mutate({
                  id: numericId,
                  read: !query.data!.read,
                })
              }
              disabled={markRead.isPending}
            >
              Mark as {query.data.read ? "unread" : "read"}
            </Button>
            <DeleteButton
              label="this message"
              onConfirm={() => remove.mutate({ id: numericId })}
              pending={remove.isPending}
            />
          </div>
        </div>
      )}
    </div>
  );
}
