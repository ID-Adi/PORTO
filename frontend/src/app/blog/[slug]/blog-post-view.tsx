"use client";

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Calendar } from "lucide-react";
import Link from "next/link";
import GithubSlugger from "github-slugger";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeHighlight from "rehype-highlight";

import { SiteShell } from "@/layout/site-shell";
import { CopyButton } from "@/components/copy-button";
import { ShareMenu } from "@/components/common/share-menu";
import { BlogPostSkeleton } from "@/components/skeletons/blog-post-skeleton";
import { usePublicBlogPost } from "@/features/public-data/client";
import { parseBlogTags } from "@/features/public-data/blog-meta";
import { TOCMinimap, type TOCItemType } from "@/components/toc-minimap";

function extractTOC(markdown: string): TOCItemType[] {
  const headingRegex = /^(#{2,4})\s+(.+)$/gm;
  const items: TOCItemType[] = [];
  const slugger = new GithubSlugger();
  let match;
  while ((match = headingRegex.exec(markdown)) !== null) {
    const depth = match[1].length;
    const title = match[2].trim();
    const url = `#${slugger.slug(title)}`;
    items.push({ title, url, depth });
  }
  return items;
}

const remarkPlugins = [remarkGfm];
const rehypePlugins = [
  rehypeSlug,
  [
    rehypeAutolinkHeadings,
    {
      behavior: "append",
      properties: {
        className: ["heading-anchor"],
        ariaHidden: true,
        tabIndex: -1,
      },
    },
  ],
  [rehypeHighlight, { detect: true, ignoreMissing: true }],
] as React.ComponentProps<typeof ReactMarkdown>["rehypePlugins"];

export function BlogPostView({ slug }: { slug: string }) {
  const { data: post, isLoading } = usePublicBlogPost(slug);

  const content = post?.content ?? "";
  const toc = useMemo(() => (content ? extractTOC(content) : []), [content]);
  const tags = useMemo(() => parseBlogTags(post?.meta), [post?.meta]);

  if (isLoading) {
    return (
      <SiteShell>
        <div className="page-frame border-x border-(--line)">
          <BlogPostSkeleton />
        </div>
      </SiteShell>
    );
  }

  if (!post) {
    return (
      <SiteShell>
        <div className="page-frame border-x border-(--line)">
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <h1 className="text-lg font-semibold">Post not found</h1>
            <p className="mt-1 text-sm text-(--muted-foreground)">
              Artikel tidak ditemukan atau belum dipublikasikan.
            </p>
          </div>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="page-frame border-x border-(--line)">
        <article>
          {/* Back link */}
          <div className="screen-line-bottom px-4 py-3 sm:px-5">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 font-mono text-[11px] text-(--muted-foreground) transition-colors hover:text-(--foreground)"
            >
              <ArrowLeft className="size-3" />
              Back to articles
            </Link>
          </div>

          {/* Header */}
          <header className="screen-line-bottom px-4 py-6 sm:px-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-1.5 font-mono text-[11px] text-(--muted-foreground)">
                <Calendar className="size-3 shrink-0" />
                <time>
                  {new Date(
                    post.publishedAt ?? post.createdAt,
                  ).toLocaleDateString("id-ID", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
              </div>
              {/* Share artikel */}
              <ShareMenu
                slug={post.slug}
                title={post.title}
                size="md"
                className="shrink-0"
              />
            </div>
            <h1 className="mt-3 font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              {post.title}
            </h1>
            {post.description ? (
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-(--muted-foreground)">
                {post.description}
              </p>
            ) : null}
            {tags.length > 0 ? (
              <div className="scrollbar-none mt-3 flex max-w-full items-center gap-1.5 overflow-x-auto">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex shrink-0 items-center rounded-full border border-(--line) bg-(--muted)/40 px-2 py-0.5 font-mono text-[10px] whitespace-nowrap text-(--muted-foreground)"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </header>

          {/* Content + TOC */}
          <div className="relative flex">
            {/* Main content */}
            <div className="min-w-0 flex-1 px-4 py-8 sm:px-5">
              {post.content ? (
                <div className="prose prose-sm prose-zinc max-w-none dark:prose-invert prose-headings:font-heading prose-headings:tracking-tight prose-h2:mt-8 prose-h2:text-lg prose-h3:mt-6 prose-h3:text-base prose-p:leading-relaxed prose-pre:rounded-none prose-pre:border prose-pre:border-(--line) prose-pre:bg-(--surface) prose-code:text-xs prose-li:leading-relaxed prose-table:my-0">
                  <ReactMarkdown
                    remarkPlugins={remarkPlugins}
                    rehypePlugins={rehypePlugins}
                    components={{
                      table: ({ children, ...props }) => (
                        <div className="my-6 overflow-x-auto">
                          <table {...props}>{children}</table>
                        </div>
                      ),
                      pre: ({ children, ...props }) => (
                        <div className="group/code relative">
                          <pre {...props}>{children}</pre>
                          <CopyButton
                            className="absolute top-2 right-2 size-7 opacity-0 transition-opacity group-hover/code:opacity-100"
                            size="icon"
                            variant="ghost"
                            text={() => {
                              const el = document.querySelector(
                                ".group\\/code:hover pre code",
                              );
                              return el?.textContent ?? "";
                            }}
                          />
                        </div>
                      ),
                    }}
                  >
                    {content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm text-(--muted-foreground) italic">
                  Konten belum tersedia.
                </p>
              )}
            </div>

            {/* TOC Minimap - sticky sidebar */}
            {toc.length > 0 ? (
              <aside className="hidden shrink-0 pr-4 pt-8 lg:block sm:pr-5">
                <div className="sticky top-24">
                  <TOCMinimap items={toc} />
                </div>
              </aside>
            ) : null}
          </div>
        </article>
      </div>
    </SiteShell>
  );
}
