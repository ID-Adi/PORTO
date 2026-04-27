"use client";

import { SkillForm } from "@/features/admin/forms/skill-form";
import { PageHeader } from "@/features/admin/components/page-header";

export default function NewSkillPage() {
  return (
    <div>
      <PageHeader title="New skill" />
      <SkillForm />
    </div>
  );
}
