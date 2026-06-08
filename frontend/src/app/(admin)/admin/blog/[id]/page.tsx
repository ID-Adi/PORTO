"use client";

import { use } from "react";

import { trpc } from "@/lib/trpc";
import { BlogForm } from "@/features/admin/forms/blog-form";
import { PageHeader } from "@/features/admin/components/page-header";

function toLocalDateTime(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function EditBlogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const numericId = Number(id);
  const query = trpc.blog.byId.useQuery({ id: numericId });

  return (
    <div>
      <PageHeader title="Edit post" />
      {query.isLoading ? (
        <div className="text-sm text-(--muted-foreground)">Loading…</div>
      ) : !query.data ? (
        <div className="text-sm text-(--destructive)">Post not found.</div>
      ) : (
        <BlogForm
          id={numericId}
          initial={{
            title: query.data.title,
            slug: query.data.slug,
            description: query.data.description ?? "",
            content: query.data.content ?? "",
            meta: query.data.meta ?? "",
            category:
              query.data.category === "saham_crypto"
                ? "saham_crypto"
                : "global",
            coverUrl: query.data.coverUrl ?? "",
            published: query.data.published,
            publishedAt: toLocalDateTime(query.data.publishedAt),
          }}
        />
      )}
    </div>
  );
}
