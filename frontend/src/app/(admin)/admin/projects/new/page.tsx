"use client";

import { ProjectForm } from "@/features/admin/forms/project-form";
import { PageHeader } from "@/features/admin/components/page-header";

export default function NewProjectPage() {
  return (
    <div>
      <PageHeader title="New project" description="Add a new portfolio project" />
      <ProjectForm />
    </div>
  );
}
