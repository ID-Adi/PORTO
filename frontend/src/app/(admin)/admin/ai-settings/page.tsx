"use client";

import { AiSettingsForm } from "@/features/admin/forms/ai-settings-form";
import { PageHeader } from "@/features/admin/components/page-header";

export default function AiSettingsPage() {
  return (
    <div>
      <PageHeader
        title="AI Settings"
        description="Manage provider settings used by Tools generators."
      />
      <AiSettingsForm />
    </div>
  );
}
