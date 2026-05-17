"use client";

import { use } from "react";

import { trpc } from "@/lib/trpc";
import { OverviewForm } from "@/features/admin/forms/overview-form";
import { PageHeader } from "@/features/admin/components/page-header";

type Position = "lead" | "left" | "right";
type Kind = "text" | "time";

export default function EditOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const numericId = Number(id);
  const query = trpc.profileOverview.byId.useQuery({ id: numericId });

  return (
    <div>
      <PageHeader title="Edit overview row" />
      {query.isLoading ? (
        <div className="text-sm text-(--muted-foreground)">Loading…</div>
      ) : !query.data ? (
        <div className="text-sm text-(--destructive)">Row not found.</div>
      ) : (
        <OverviewForm
          id={numericId}
          initial={{
            position: query.data.position as Position,
            icon: query.data.icon,
            value: query.data.value,
            kind: query.data.kind as Kind,
            copyable: query.data.copyable,
            note: query.data.note ?? "",
            sortOrder: query.data.sortOrder,
          }}
        />
      )}
    </div>
  );
}
