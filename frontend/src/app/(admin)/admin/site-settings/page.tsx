"use client";

import { PageHeader } from "@/features/admin/components/page-header";
import { SiteSettingsForm } from "@/features/admin/forms/site-settings-form";

export default function SiteSettingsPage() {
  return (
    <div>
      <PageHeader
        title="Site Settings"
        description="Manage profile identity and header logo shown on the public site."
      />
      <SiteSettingsForm />
    </div>
  );
}
