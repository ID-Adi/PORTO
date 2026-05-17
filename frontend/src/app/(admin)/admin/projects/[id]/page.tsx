"use client";

import { use } from "react";

import { trpc } from "@/lib/trpc";
import { ProjectForm } from "@/features/admin/forms/project-form";
import { PageHeader } from "@/features/admin/components/page-header";

export default function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const numericId = Number(id);
  const query = trpc.projects.byId.useQuery({ id: numericId });

  return (
    <div>
      <PageHeader title="Edit project" />
      {query.isLoading ? (
        <div className="text-sm text-(--muted-foreground)">Loading…</div>
      ) : !query.data ? (
        <div className="text-sm text-(--destructive)">Project not found.</div>
      ) : (
        <ProjectForm
          id={numericId}
          initial={{
            title: query.data.title,
            slug: query.data.slug,
            description: query.data.description ?? "",
            detail: query.data.detail ?? "",
            period: query.data.period ?? "",
            imageUrl: query.data.imageUrl ?? "",
            url: query.data.url ?? "",
            repoUrl: query.data.repoUrl ?? "",
            highlights: (query.data.highlights ?? []).join("\n"),
            tags: (query.data.tags ?? []).join(", "),
            sortOrder: query.data.sortOrder,
          }}
        />
      )}
    </div>
  );
}
