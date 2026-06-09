"use client";

import { isValidElement, useMemo, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  FileText,
  Link2,
  ListChecks,
  Newspaper,
  ShieldAlert,
  Sigma,
  Table2,
} from "lucide-react";
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

const getPlainText = (children: ReactNode): string => {
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }
  if (Array.isArray(children)) {
    return children.map(getPlainText).join("");
  }
  if (isValidElement<{ children?: ReactNode }>(children)) {
    return getPlainText(children.props.children);
  }
  return "";
};

const getHeadingIcon = (text: string) => {
  const normalized = text.toLowerCase();
  if (/snapshot|market|mover|top|ihsg|btc|eth|ticker|aset/.test(normalized)) {
    return BarChart3;
  }
  if (/berita|news|headline|sentimen/.test(normalized)) return Newspaper;
  if (/watchlist|pemantauan|checklist|besok/.test(normalized)) {
    return ListChecks;
  }
  if (/risiko|disclaimer|catatan/.test(normalized)) return ShieldAlert;
  if (/sumber|referensi|link/.test(normalized)) return Link2;
  if (/analisis|ringkasan|eksekutif|flow|diagram/.test(normalized)) {
    return Sigma;
  }
  return FileText;
};

const isDiagramBlock = (text: string, className?: string) => {
  const lower = className?.toLowerCase() ?? "";
  return (
    lower.includes("language-ascii") ||
    lower.includes("language-flow") ||
    lower.includes("language-dfd") ||
    /[┌┐└┘├┤─│▶→←↔]/.test(text) ||
    /\[[^\]]+\]\s*(-->|->|=>|→)\s*\[[^\]]+\]/.test(text)
  );
};

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
                      h2: ({ children, ...props }) => {
                        const text = getPlainText(children);
                        const Icon = getHeadingIcon(text);
                        return (
                          <h2
                            {...props}
                            className="group mt-9 flex scroll-mt-24 items-center gap-2 border-b border-(--line) pb-2 font-heading text-lg font-semibold tracking-tight"
                          >
                            <span className="flex size-6 shrink-0 items-center justify-center border border-(--line) bg-(--muted)/35 text-(--muted-foreground)">
                              <Icon className="size-3.5" aria-hidden />
                            </span>
                            <span>{children}</span>
                          </h2>
                        );
                      },
                      h3: ({ children, ...props }) => {
                        const text = getPlainText(children);
                        const Icon = getHeadingIcon(text);
                        return (
                          <h3
                            {...props}
                            className="mt-7 flex scroll-mt-24 items-center gap-2 font-heading text-base font-semibold tracking-tight"
                          >
                            <Icon
                              className="size-3.5 shrink-0 text-(--muted-foreground)"
                              aria-hidden
                            />
                            <span>{children}</span>
                          </h3>
                        );
                      },
                      a: ({ children, href, ...props }) => (
                        <a
                          {...props}
                          href={href}
                          target={href?.startsWith("http") ? "_blank" : undefined}
                          rel={
                            href?.startsWith("http")
                              ? "noreferrer noopener"
                              : undefined
                          }
                          className="font-medium text-blue-600 underline underline-offset-4 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {children}
                        </a>
                      ),
                      table: ({ children, ...props }) => (
                        <div className="not-prose my-7 overflow-x-auto border border-(--line) bg-(--background)">
                          <table
                            {...props}
                            className="w-full min-w-[640px] border-collapse text-left text-sm"
                          >
                            {children}
                          </table>
                        </div>
                      ),
                      thead: ({ children, ...props }) => (
                        <thead
                          {...props}
                          className="border-b border-(--line) bg-(--muted)/35"
                        >
                          {children}
                        </thead>
                      ),
                      th: ({ children, ...props }) => (
                        <th
                          {...props}
                          className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] font-semibold tracking-[0.12em] text-(--foreground) uppercase after:content-none"
                        >
                          {children}
                        </th>
                      ),
                      td: ({ children, ...props }) => (
                        <td
                          {...props}
                          className="border-t border-(--line) px-3 py-2.5 align-top text-[13px] leading-relaxed text-(--foreground)"
                        >
                          {children}
                        </td>
                      ),
                      blockquote: ({ children, ...props }) => (
                        <blockquote
                          {...props}
                          className="not-prose my-6 border-l-2 border-(--foreground) bg-(--muted)/25 px-4 py-3 text-sm leading-relaxed text-(--muted-foreground)"
                        >
                          {children}
                        </blockquote>
                      ),
                      code: ({ children, className, ...props }) => (
                        <code
                          {...props}
                          className={`${className ?? ""} rounded-none bg-(--muted)/45 px-1 py-0.5 font-mono text-[12px] text-(--foreground)`}
                        >
                          {children}
                        </code>
                      ),
                      pre: ({ children, ...props }) => {
                        const codeEl = Array.isArray(children)
                          ? children.find(isValidElement)
                          : children;
                        const text = getPlainText(children);
                        const className = isValidElement<{ className?: string }>(
                          codeEl,
                        )
                          ? codeEl.props.className
                          : undefined;
                        const diagram = isDiagramBlock(text, className);

                        return (
                          <div
                            className={`not-prose group/code relative my-7 overflow-hidden border border-(--line) bg-(--surface) ${diagram ? "surface-dots" : ""}`}
                          >
                            {diagram ? (
                              <div className="border-b border-(--line) bg-(--muted)/35 px-3 py-2 font-mono text-[10px] tracking-[0.16em] text-(--muted-foreground) uppercase">
                                ASCII / Flow Diagram
                              </div>
                            ) : null}
                            <pre
                              {...props}
                              className={`${diagram ? "min-w-max" : ""} overflow-x-auto bg-transparent p-4 font-mono text-[12px] leading-relaxed text-(--foreground)`}
                            >
                              {children}
                            </pre>
                            <CopyButton
                              className="absolute top-2 right-2 size-7 opacity-0 transition-opacity group-hover/code:opacity-100"
                              size="icon"
                              variant="ghost"
                              text={() => text}
                            />
                          </div>
                        );
                      },
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
