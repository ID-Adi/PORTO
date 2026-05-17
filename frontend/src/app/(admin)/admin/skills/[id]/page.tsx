"use client";

import { use } from "react";

import { trpc } from "@/lib/trpc";
import { SkillForm } from "@/features/admin/forms/skill-form";
import { PageHeader } from "@/features/admin/components/page-header";

export default function EditSkillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const numericId = Number(id);
  const query = trpc.skills.byId.useQuery({ id: numericId });

  return (
    <div>
      <PageHeader title="Edit skill" />
      {query.isLoading ? (
        <div className="text-sm text-(--muted-foreground)">Loading…</div>
      ) : !query.data ? (
        <div className="text-sm text-(--destructive)">Skill not found.</div>
      ) : (
        <SkillForm
          id={numericId}
          initial={{
            name: query.data.name,
            category: query.data.category,
            level: query.data.level,
            description: query.data.description ?? "",
            years: query.data.years ?? "",
            iconUrl: query.data.iconUrl ?? "",
            sortOrder: query.data.sortOrder,
          }}
        />
      )}
    </div>
  );
}
