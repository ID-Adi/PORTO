"use client";

import { use } from "react";

import { trpc } from "@/lib/trpc";
import { SkillForm } from "@/features/admin/forms/skill-form";
import { PageHeader } from "@/features/admin/components/page-header";

type Category = "frontend" | "backend" | "tooling" | "other";
type Level = "beginner" | "intermediate" | "advanced" | "expert";

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
            category: query.data.category as Category,
            level: query.data.level as Level,
            iconUrl: query.data.iconUrl ?? "",
            sortOrder: query.data.sortOrder,
          }}
        />
      )}
    </div>
  );
}
