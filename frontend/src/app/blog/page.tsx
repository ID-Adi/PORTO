"use client";

import Link from "next/link";
import { Calendar } from "lucide-react";

import { cn } from "@/lib/utils";
import { SiteShell } from "@/layout/site-shell";
import { trpc } from "@/lib/trpc";

export default function BlogPage() {
  const { data: posts, isLoading } = trpc.blog.list.useQuery();

  const published = posts?.filter((p) => p.published) ?? [];

  return (
    <SiteShell>
      <div className="page-frame border-x border-(--line)">
        <section>
          <header className="screen-line-bottom px-4 py-6 sm:px-5">
            <span className="profile-kicker mb-2 block">03 / Blog</span>
            <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              Articles & notes.
            </h1>
            <p className="mt-2 text-sm text-(--muted-foreground)">
              Tulisan teknis, catatan eksplorasi, dan artikel mendalam.
            </p>
          </header>

          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <span className="font-mono text-xs text-(--muted-foreground)">
                Loading…
              </span>
            </div>
          ) : published.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <p className="text-sm text-(--muted-foreground)">
                Belum ada artikel yang dipublikasikan.
              </p>
            </div>
          ) : (
            <div>
              {published.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className={cn(
                    "group flex flex-col gap-1 border-b border-(--line) px-4 py-5 transition-colors last:border-b-0 hover:bg-(--muted)/50 sm:px-5",
                  )}
                >
                  <h2 className="text-sm font-medium tracking-[-0.03em] group-hover:underline">
                    {post.title}
                  </h2>
                  {post.description ? (
                    <p className="line-clamp-2 text-xs text-(--muted-foreground)">
                      {post.description}
                    </p>
                  ) : null}
                  <div className="mt-1 flex items-center gap-1.5 font-mono text-[11px] text-(--muted-foreground)">
                    <Calendar className="size-3" />
                    <time>
                      {new Date(
                        post.publishedAt ?? post.createdAt,
                      ).toLocaleDateString("id-ID", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                    {post.meta ? (
                      <>
                        <span className="text-(--border)">·</span>
                        <span>{post.meta}</span>
                      </>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </SiteShell>
  );
}
