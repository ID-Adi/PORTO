"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar } from "lucide-react";

import { SiteShell } from "@/layout/site-shell";
import { ThumbImage } from "@/components/common/thumb-image";
import { BlogListSkeleton } from "@/components/skeletons/blog-list-skeleton";
import { usePublicBlogPosts } from "@/features/public-data/client";
import { normalizeImageUrl } from "@/lib/image-url";
import {
  MediaExpandModal,
  type MediaExpandTarget,
} from "@/features/tools/components/media-expand-modal";

export default function BlogPage() {
  const { data: posts, isLoading } = usePublicBlogPosts();
  const [preview, setPreview] = useState<MediaExpandTarget | null>(null);

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
            <BlogListSkeleton />
          ) : published.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <p className="text-sm text-(--muted-foreground)">
                Belum ada artikel yang dipublikasikan.
              </p>
            </div>
          ) : (
            <div>
              {published.map((post) => (
                <article
                  key={post.id}
                  className="group flex items-start gap-4 border-b border-(--line) px-4 py-5 transition-colors last:border-b-0 hover:bg-(--muted)/50 sm:px-5"
                >
                  <button
                    type="button"
                    aria-label={
                      post.coverUrl
                        ? `Preview gambar: ${post.title}`
                        : post.title
                    }
                    onClick={() => {
                      if (!post.coverUrl) return;
                      setPreview({
                        kind: "image",
                        url: normalizeImageUrl(post.coverUrl),
                        prompt: post.title,
                      });
                    }}
                    className="shrink-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-(--foreground) disabled:cursor-default"
                    disabled={!post.coverUrl}
                  >
                    <ThumbImage
                      src={post.coverUrl}
                      alt={post.title}
                      className="size-16 rounded-md border border-(--line)"
                    />
                  </button>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="flex min-w-0 flex-1 flex-col gap-1"
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
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <MediaExpandModal
        open={!!preview}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
        target={preview}
      />
    </SiteShell>
  );
}
