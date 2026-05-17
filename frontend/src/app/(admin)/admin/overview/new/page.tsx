"use client";

import { OverviewForm } from "@/features/admin/forms/overview-form";
import { PageHeader } from "@/features/admin/components/page-header";

export default function NewOverviewPage() {
  return (
    <div>
      <PageHeader title="New overview row" />
      <OverviewForm />
    </div>
  );
}
