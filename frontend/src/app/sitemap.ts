import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import { getPublicBlogPosts } from "@/features/public-data/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = ["/", "/#skills", "/#projects", "/#writing", "/#partners"];
  const blogPosts = (await getPublicBlogPosts()) ?? [];

  return [
    ...staticRoutes.map((route, index) => ({
      url: `${siteConfig.url}${route}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: index === 0 ? 1 : 0.8,
    })),
    ...blogPosts.map((post) => ({
      url: `${siteConfig.url}/blog/${post.slug}`,
      lastModified: new Date(post.publishedAt ?? post.createdAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
