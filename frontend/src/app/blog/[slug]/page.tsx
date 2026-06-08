import type { Metadata } from "next";

import { siteConfig } from "@/config/site";
import { normalizeImageUrl } from "@/lib/image-url";
import { getPublicBlogPost } from "@/features/public-data/server";
import { parseBlogTags } from "@/features/public-data/blog-meta";

import { BlogPostView } from "./blog-post-view";

type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublicBlogPost(slug);

  if (!post) {
    return {
      title: "Post not found",
      description: "Artikel tidak ditemukan atau belum dipublikasikan.",
    };
  }

  const url = `${siteConfig.url.replace(/\/$/, "")}/blog/${post.slug}`;
  const description = post.description ?? siteConfig.description;
  const tags = parseBlogTags(post.meta);
  const publishedTime = (post.publishedAt ?? post.createdAt)
    ? new Date(post.publishedAt ?? post.createdAt).toISOString()
    : undefined;

  // Cover post jadi OG image (absolut). Fallback ke OG default situs.
  const ogImage = post.coverUrl
    ? normalizeImageUrl(post.coverUrl)
    : siteConfig.ogImage;

  return {
    title: post.title,
    description,
    keywords: tags.length > 0 ? tags : undefined,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: post.title,
      description,
      url,
      siteName: siteConfig.name,
      publishedTime,
      tags,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      creator: siteConfig.creator,
      images: [ogImage],
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;

  // JSON-LD BlogPosting untuk hasil kaya di mesin pencari.
  const post = await getPublicBlogPost(slug);
  const jsonLd = post
    ? {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: post.title,
        description: post.description ?? siteConfig.description,
        image: post.coverUrl
          ? normalizeImageUrl(post.coverUrl)
          : new URL(siteConfig.ogImage, siteConfig.url).toString(),
        datePublished: (post.publishedAt ?? post.createdAt)
          ? new Date(post.publishedAt ?? post.createdAt).toISOString()
          : undefined,
        keywords: parseBlogTags(post.meta).join(", ") || undefined,
        url: `${siteConfig.url.replace(/\/$/, "")}/blog/${post.slug}`,
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": `${siteConfig.url.replace(/\/$/, "")}/blog/${post.slug}`,
        },
        author: {
          "@type": "Person",
          name: "Prasetya Adi Wijaya",
          url: siteConfig.url,
        },
      }
    : null;

  return (
    <>
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
      <BlogPostView slug={slug} />
    </>
  );
}
