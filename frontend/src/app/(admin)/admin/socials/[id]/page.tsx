"use client";

import { use } from "react";

import { trpc } from "@/lib/trpc";
import { SocialsForm } from "@/features/admin/forms/socials-form";
import { PageHeader } from "@/features/admin/components/page-header";

export default function EditSocialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const numericId = Number(id);
  const query = trpc.socials.byId.useQuery({ id: numericId });

  return (
    <div>
      <PageHeader title="Edit social" />
      {query.isLoading ? (
        <div className="text-sm text-(--muted-foreground)">Loading…</div>
      ) : !query.data ? (
        <div className="text-sm text-(--destructive)">Social not found.</div>
      ) : (
        <SocialsForm
          id={numericId}
          initial={{
            label: query.data.label,
            href: query.data.href,
            detail: query.data.detail ?? "",
            iconUrl: query.data.iconUrl ?? "",
            sortOrder: query.data.sortOrder,
          }}
        />
      )}
    </div>
  );
}
