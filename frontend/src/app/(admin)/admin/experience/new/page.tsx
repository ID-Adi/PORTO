"use client";

import { ExperienceForm } from "@/features/admin/forms/experience-form";
import { PageHeader } from "@/features/admin/components/page-header";

export default function NewExperiencePage() {
  return (
    <div>
      <PageHeader title="New experience" />
      <ExperienceForm />
    </div>
  );
}
