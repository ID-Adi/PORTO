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
import type { PublicBlogPost } from "@/features/public-data/types";
import { TOCMinimap, type TOCItemType } from "@/components/toc-minimap";

function extractTOC(markdown: string): TOCItemType[] {
  const items: TOCItemType[] = [];
  const slugger = new GithubSlugger();
  // Lacak code fence agar baris komentar `## ...` di dalam blok ``` (umum di
  // contoh bash/yaml) tidak ikut jadi item TOC dengan anchor yang tak ada.
  let fence: { marker: "`" | "~"; length: number } | null = null;
  for (const line of markdown.split(/\r?\n/)) {
    const fenceMatch = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[1][0] as "`" | "~";
      const length = fenceMatch[1].length;
      if (!fence) {
        fence = { marker, length };
      } else if (fence.marker === marker && length >= fence.length) {
        fence = null;
      }
      continue;
    }
    if (fence) continue;
    const match = /^(#{2,4})\s+(.+)$/.exec(line);
    if (!match) continue;
    const depth = match[1].length;
    const title = match[2].trim();
    items.push({ title, url: `#${slugger.slug(title)}`, depth });
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
  // rehype-highlight v7 otomatis melewati bahasa yang tak dikenal.
  [rehypeHighlight, { detect: true, plainText: ["txt", "text", "plain"] }],
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

const getCodeLanguage = (className?: string) => {
  const match = /(?:^|\s)(?:language|lang)-([^\s]+)/.exec(className ?? "");
  return match?.[1]?.toUpperCase() ?? null;
};

const isBlockCode = (className?: string) =>
  Boolean(className?.match(/(?:^|\s)(?:hljs|language-[^\s]+|lang-[^\s]+)/));

const formatCodeLabel = (language: string | null, diagram: boolean) => {
  if (diagram) return "ASCII / Flow Diagram";
  return language ? `Code · ${language}` : "Code";
};

const toValidDate = (value: string | Date | null | undefined) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export function BlogPostView({
  slug,
  initialPost,
}: {
  slug: string;
  // Hasil fetch server (page.tsx) — jadi initialData React Query supaya konten
  // langsung ter-render di HTML awal tanpa skeleton + fetch ulang.
  initialPost?: PublicBlogPost;
}) {
  const { data: post, isLoading } = usePublicBlogPost(slug, initialPost);

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

  const displayDate = toValidDate(post.publishedAt ?? post.createdAt);

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
                {displayDate ? (
                  <time dateTime={displayDate.toISOString()}>
                    {displayDate.toLocaleDateString("id-ID", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                ) : (
                  <span>Tanggal tidak tersedia</span>
                )}
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
                      code: ({ children, className, node: _node, ...props }) => {
                        if (isBlockCode(className)) {
                          return (
                            <code
                              {...props}
                              className={`${className ?? ""} block bg-transparent p-0 font-mono text-[12px] leading-relaxed text-(--foreground)`}
                            >
                              {children}
                            </code>
                          );
                        }

                        return (
                          <code
                            {...props}
                            className="rounded-none bg-(--muted)/45 px-1 py-0.5 font-mono text-[12px] text-(--foreground)"
                          >
                            {children}
                          </code>
                        );
                      },
                      pre: ({ children, node: _node, ...props }) => {
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
                        const language = getCodeLanguage(className);
                        const label = formatCodeLabel(language, diagram);

                        return (
                          <div
                            className={`not-prose blog-code-block group/code relative my-7 overflow-hidden border border-(--line) bg-(--surface) ${diagram ? "surface-dots" : ""}`}
                          >
                            <div className="flex min-h-10 items-center justify-between gap-3 border-b border-(--line) bg-(--muted)/25 px-3 py-2">
                              <div className="flex min-w-0 items-center gap-2">
                                <span className="size-1.5 shrink-0 bg-(--foreground)" />
                                <span className="truncate font-mono text-[10px] tracking-[0.18em] text-(--muted-foreground) uppercase">
                                  {label}
                                </span>
                              </div>
                              <CopyButton
                                className="size-7 shrink-0 border border-(--line) bg-(--background) opacity-70 transition-opacity hover:opacity-100"
                                size="icon"
                                variant="ghost"
                                text={() => text}
                              />
                            </div>
                            <pre
                              {...props}
                              className={`${diagram ? "min-w-max" : ""} overflow-x-auto bg-transparent p-4 font-mono text-[12px] leading-relaxed text-(--foreground)`}
                            >
                              {children}
                            </pre>
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
