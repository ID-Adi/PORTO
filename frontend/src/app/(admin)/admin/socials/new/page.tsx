"use client";

import { SocialsForm } from "@/features/admin/forms/socials-form";
import { PageHeader } from "@/features/admin/components/page-header";

export default function NewSocialPage() {
  return (
    <div>
      <PageHeader title="New social" />
      <SocialsForm />
    </div>
  );
}
