"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { Calendar, Search, X } from "lucide-react";

import { SiteShell } from "@/layout/site-shell";
import { ThumbImage } from "@/components/common/thumb-image";
import { ShareMenu } from "@/components/common/share-menu";
import { BlogListSkeleton } from "@/components/skeletons/blog-list-skeleton";
import { usePublicBlogPosts } from "@/features/public-data/client";
import {
  getBlogCategoryLabel,
  parseBlogTags,
} from "@/features/public-data/blog-meta";
import type { BlogCategory, PublicBlogPost } from "@/features/public-data/types";
import { cn } from "@/lib/utils";
import { normalizeImageUrl } from "@/lib/image-url";
import {
  MediaExpandModal,
  type MediaExpandTarget,
} from "@/features/tools/components/media-expand-modal";

const BLOG_CATEGORY_TABS: { value: BlogCategory; label: string }[] = [
  { value: "global", label: "Global" },
  { value: "saham_crypto", label: "Saham & Crypto" },
  { value: "learning", label: "Learning" },
];

const CATEGORY_STORAGE_KEY = "porto.blog.activeCategory";

function isBlogCategory(value: string | null): value is BlogCategory {
  return BLOG_CATEGORY_TABS.some((tab) => tab.value === value);
}

function readStoredCategory(): BlogCategory {
  if (typeof window === "undefined") return "global";
  try {
    const raw = window.localStorage.getItem(CATEGORY_STORAGE_KEY);
    return isBlogCategory(raw) ? raw : "global";
  } catch {
    return "global";
  }
}

const CATEGORY_COPY: Record<
  BlogCategory,
  { description: string; empty: string }
> = {
  global: {
    description: "Tulisan teknis, catatan eksplorasi, dan artikel mendalam.",
    empty: "Belum ada artikel yang dipublikasikan.",
  },
  saham_crypto: {
    description:
      "Laporan pasar saham dan crypto dari agent cronjob berbasis data runtime.",
    empty: "Belum ada laporan Saham & Crypto yang dipublikasikan.",
  },
  learning: {
    description: "Catatan belajar, riset, dan breakdown konsep teknis.",
    empty: "Belum ada artikel learning yang dipublikasikan.",
  },
};

function filterPosts(posts: PublicBlogPost[], query: string): PublicBlogPost[] {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (terms.length === 0) return posts;

  return posts.filter((post) => {
    const title = post.title.toLowerCase();
    const desc = (post.description ?? "").toLowerCase();
    const tags = parseBlogTags(post.meta).join(" ").toLowerCase();
    const haystack = `${title} ${desc} ${tags}`;
    return terms.every((t) => haystack.includes(t));
  });
}

export default function BlogPage() {
  const [category, setCategory] = useState<BlogCategory>("global");

  // Hidrasi tab aktif dari localStorage pasca-mount (tidak bisa di-init di
  // useState karena localStorage tak tersedia saat SSR → hindari mismatch).
  useEffect(() => {
    setCategory(readStoredCategory());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(CATEGORY_STORAGE_KEY, category);
    } catch {
      // ignore quota / private mode
    }
  }, [category]);

  const { data: posts, isLoading } = usePublicBlogPosts(category);
  const [preview, setPreview] = useState<MediaExpandTarget | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const published = posts?.filter((p) => p.published) ?? [];
  const filtered = useMemo(
    () => filterPosts(published, searchQuery),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [posts, searchQuery],
  );
  const copy = CATEGORY_COPY[category];

  const handleClearSearch = useCallback(() => setSearchQuery(""), []);

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
              {copy.description}
            </p>

            {/* Segmented switch kategori */}
            <div className="mt-4 overflow-x-auto">
              <div
                role="tablist"
                aria-label="Kategori blog"
                className="inline-flex min-w-max border border-(--line) font-mono text-[11px]"
              >
                {BLOG_CATEGORY_TABS.map((tab, index) => {
                  const active = tab.value === category;
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setCategory(tab.value)}
                      className={cn(
                        "shrink-0 px-3 py-1.5 tracking-wide whitespace-nowrap uppercase transition-colors",
                        index > 0 && "border-l border-(--line)",
                        active
                          ? "bg-(--foreground) text-(--background)"
                          : "text-(--muted-foreground) hover:bg-(--muted) hover:text-(--foreground)",
                      )}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </header>

          {/* Search field */}
          <div className="border-b border-(--line) px-4 py-3 sm:px-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-(--muted-foreground)" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari artikel..."
                className="h-8 w-full border border-(--line) bg-transparent pl-8 pr-8 font-mono text-[12px] tracking-wide text-(--foreground) outline-none transition-colors placeholder:text-(--muted-foreground) focus:border-(--foreground)"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  aria-label="Hapus pencarian"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-(--muted-foreground) transition-colors hover:text-(--foreground)"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          {isLoading ? (
            <BlogListSkeleton />
          ) : published.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <p className="text-sm text-(--muted-foreground)">
                {copy.empty}
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <p className="text-sm text-(--muted-foreground)">
                Tidak ada artikel yang cocok dengan &ldquo;{searchQuery}&rdquo;
              </p>
            </div>
          ) : (
            <div>
              {filtered.map((post) => {
                const tags = parseBlogTags(post.meta);
                return (
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
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <Link
                        href={`/blog/${post.slug}`}
                        className="flex min-w-0 flex-col gap-1"
                      >
                        <h2 className="text-sm font-medium tracking-[-0.03em] group-hover:underline">
                          {post.title}
                        </h2>
                        {post.description ? (
                          <p className="line-clamp-2 text-xs text-(--muted-foreground)">
                            {post.description}
                          </p>
                        ) : null}
                      </Link>
                      <div className="mt-1 flex min-w-0 items-center gap-2 font-mono text-[11px] text-(--muted-foreground)">
                        {post.category !== "global" ? (
                          <span className="shrink-0 border border-(--line) px-1.5 py-0.5 text-[9px] uppercase tracking-wide">
                            {getBlogCategoryLabel(post.category)}
                          </span>
                        ) : null}
                        <span className="flex shrink-0 items-center gap-1.5">
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
                        </span>
                        {tags.length > 0 ? (
                          <>
                            <span className="shrink-0 text-(--border)">·</span>
                            {/* Tag scrollable horizontal — max-w supaya tidak wrap ke bawah */}
                            <div className="scrollbar-none flex min-w-0 max-w-full items-center gap-1.5 overflow-x-auto">
                              {tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex shrink-0 items-center rounded-full border border-(--line) bg-(--muted)/40 px-2 py-0.5 text-[10px] whitespace-nowrap text-(--muted-foreground)"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </>
                        ) : null}
                      </div>
                    </div>
                    {/* Tombol share per card */}
                    <div className="shrink-0 self-center">
                      <ShareMenu slug={post.slug} title={post.title} />
                    </div>
                  </article>
                );
              })}
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
