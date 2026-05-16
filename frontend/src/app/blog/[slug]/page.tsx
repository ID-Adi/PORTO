"use client";

import { useParams } from "next/navigation";
import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Calendar } from "lucide-react";
import Link from "next/link";

import { SiteShell } from "@/layout/site-shell";
import { trpc } from "@/lib/trpc";
import { CopyButton } from "@/components/copy-button";
import { TOCMinimap, type TOCItemType } from "@/components/toc-minimap";

function extractTOC(markdown: string): TOCItemType[] {
  const headingRegex = /^(#{2,4})\s+(.+)$/gm;
  const items: TOCItemType[] = [];
  let match;
  while ((match = headingRegex.exec(markdown)) !== null) {
    const depth = match[1].length;
    const title = match[2].trim();
    const url = `#${slugify(title)}`;
    items.push({ title, url, depth });
  }
  return items;
}

function slugify(text: string) {
  return text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
}

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: post, isLoading } = trpc.blog.bySlug.useQuery({ slug });

  const toc = useMemo(
    () => (post?.content ? extractTOC(post.content) : []),
    [post?.content],
  );

  if (isLoading) {
    return (
      <SiteShell>
        <div className="page-frame border-x border-(--line)">
          <div className="flex items-center justify-center py-24">
            <span className="font-mono text-xs text-(--muted-foreground)">
              Loading…
            </span>
          </div>
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
        <article className="screen-line-top screen-line-bottom">
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
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-(--muted-foreground)">
              <Calendar className="size-3" />
              <time>
                {new Date(
                  post.publishedAt ?? post.createdAt,
                ).toLocaleDateString("id-ID", {
                  year: "numeric",
                  month: "long",
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
            <h1 className="mt-3 font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              {post.title}
            </h1>
            {post.description ? (
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-(--muted-foreground)">
                {post.description}
              </p>
            ) : null}
          </header>

          {/* Content + TOC */}
          <div className="relative flex">
            {/* Main content */}
            <div className="min-w-0 flex-1 px-4 py-8 sm:px-5">
              {post.content ? (
                <div className="prose prose-sm prose-zinc max-w-none dark:prose-invert prose-headings:font-heading prose-headings:tracking-tight prose-h2:mt-8 prose-h2:text-lg prose-h3:mt-6 prose-h3:text-base prose-p:leading-relaxed prose-pre:rounded-none prose-pre:border prose-pre:border-(--line) prose-pre:bg-(--surface) prose-code:text-xs prose-li:leading-relaxed">
                  <ReactMarkdown
                    components={{
                      h2: ({ children, ...props }) => (
                        <h2 id={slugify(String(children))} {...props}>
                          {children}
                        </h2>
                      ),
                      h3: ({ children, ...props }) => (
                        <h3 id={slugify(String(children))} {...props}>
                          {children}
                        </h3>
                      ),
                      h4: ({ children, ...props }) => (
                        <h4 id={slugify(String(children))} {...props}>
                          {children}
                        </h4>
                      ),
                      pre: ({ children, ...props }) => (
                        <div className="group/code relative">
                          <pre {...props}>{children}</pre>
                          <CopyButton
                            className="absolute right-2 top-2 size-7 opacity-0 transition-opacity group-hover/code:opacity-100"
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
                    {post.content}
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
