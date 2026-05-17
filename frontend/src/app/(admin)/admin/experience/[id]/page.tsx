"use client";

import { use } from "react";

import { trpc } from "@/lib/trpc";
import { ExperienceForm } from "@/features/admin/forms/experience-form";
import { PageHeader } from "@/features/admin/components/page-header";

export default function EditExperiencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const numericId = Number(id);
  const query = trpc.experiences.byId.useQuery({ id: numericId });

  return (
    <div>
      <PageHeader title="Edit experience" />
      {query.isLoading ? (
        <div className="text-sm text-(--muted-foreground)">Loading…</div>
      ) : !query.data ? (
        <div className="text-sm text-(--destructive)">
          Experience not found.
        </div>
      ) : (
        <ExperienceForm
          id={numericId}
          initial={{
            name: query.data.name,
            website: query.data.website ?? "",
            location: query.data.location ?? "",
            logoUrl: query.data.logoUrl ?? "",
            isCurrent: query.data.isCurrent,
            sortOrder: query.data.sortOrder,
            positions: query.data.positions.map((p) => ({
              title: p.title,
              employmentType: p.employmentType ?? "",
              period: p.period ?? "",
              description: p.description ?? "",
              achievements: (p.achievements ?? []).join("\n"),
              technologies: (p.technologies ?? []).join(", "),
              sortOrder: p.sortOrder,
            })),
          }}
        />
      )}
    </div>
  );
}
