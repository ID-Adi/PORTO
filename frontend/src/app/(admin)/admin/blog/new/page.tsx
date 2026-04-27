"use client";

import { BlogForm } from "@/features/admin/forms/blog-form";
import { PageHeader } from "@/features/admin/components/page-header";

export default function NewBlogPage() {
  return (
    <div>
      <PageHeader title="New post" />
      <BlogForm />
    </div>
  );
}
