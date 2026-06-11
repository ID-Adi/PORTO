import type { MetadataRoute } from "next";

import { getPublicBlogPosts } from "@/features/public-data/server";
import { absoluteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    { path: "/" as const, priority: 1 },
    { path: "/projects" as const, priority: 0.8 },
    { path: "/skills" as const, priority: 0.8 },
    { path: "/experience" as const, priority: 0.8 },
    { path: "/contact" as const, priority: 0.7 },
    { path: "/blog" as const, priority: 0.8 },
  ];
  const blogPosts = (await getPublicBlogPosts()) ?? [];

  return [
    ...staticRoutes.map((route) => ({
      url: absoluteUrl(route.path),
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: route.priority,
    })),
    ...blogPosts.map((post) => ({
      url: absoluteUrl(`/blog/${post.slug}`),
      lastModified: new Date(post.publishedAt ?? post.createdAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
