"use client";

import Link from "next/link";

import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import type { PublicBlogPost } from "@/features/public-data/types";

import { FrameSection } from "./profile-sheet";

function getTimestamp(p: { publishedAt: Date | string | null; createdAt: Date | string }) {
  return new Date(p.publishedAt ?? p.createdAt).getTime();
}

export function BlogShowcaseSection({
  posts: injectedPosts,
  isLoading: injectedLoading = false,
}: {
  posts?: PublicBlogPost[];
  isLoading?: boolean;
}) {
  const query = trpc.blog.list.useQuery(undefined, {
    enabled: injectedPosts === undefined,
  });
  const isLoading = injectedPosts === undefined ? query.isLoading : injectedLoading;
  const data = injectedPosts ?? query.data ?? [];

  // Home showcase tetap editorial global; laporan Saham/Crypto tidak dicampur.
  const published = data.filter((p) => p.published && p.category === "global");
  const topTwo = [...published]
    .sort((a, b) => getTimestamp(b) - getTimestamp(a))
    .slice(0, 2);

  return (
    <FrameSection
      id="writing"
      title="Blog"
      count={published.length}
      actionLabel="All Posts"
      actionHref="/blog"
    >
      {isLoading ? (
        <BlogGridSkeleton />
      ) : topTwo.length === 0 ? (
        <BlogEmptyState />
      ) : (
        <div className="grid gap-0 lg:grid-cols-2">
          {topTwo.map((post, index) => (
            <article
              key={post.id}
              className={`px-4 py-4 sm:px-5 ${
                index > 0 ? "border-t border-(--line) lg:border-t-0 lg:border-l" : ""
              }`}
            >
              <p className="profile-kicker">{post.meta ?? "Article"}</p>
              <h3 className="mt-1 text-sm font-medium tracking-[-0.03em]">{post.title}</h3>
              {post.description ? (
                <p className="mt-3 text-[12px] leading-6 text-(--muted-foreground)">
                  {post.description}
                </p>
              ) : null}
              <Link
                href={`/blog/${post.slug}`}
                className="profile-link mt-3 inline-block"
              >
                Read article
              </Link>
            </article>
          ))}
        </div>
      )}
    </FrameSection>
  );
}

function BlogGridSkeleton() {
  return (
    <div className="grid gap-0 lg:grid-cols-2">
      {[0, 1].map((i) => (
        <div
          key={i}
          className={`px-4 py-4 sm:px-5 ${
            i > 0 ? "border-t border-(--line) lg:border-t-0 lg:border-l" : ""
          }`}
          aria-hidden
        >
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-4 w-3/4" />
          <Skeleton className="mt-4 h-3 w-full" />
          <Skeleton className="mt-2 h-3 w-5/6" />
          <Skeleton className="mt-4 h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

function BlogEmptyState() {
  return (
    <div className="px-4 py-8 text-center sm:px-5">
      <p className="text-sm text-(--muted-foreground)">Belum ada artikel.</p>
    </div>
  );
}
