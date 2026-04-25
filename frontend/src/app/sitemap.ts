import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ["/", "/#components", "/#projects", "/#writing", "/#partners"];
  const blogSlugs: string[] = [];

  return [
    ...staticRoutes.map((route, index) => ({
      url: `${siteConfig.url}${route}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: index === 0 ? 1 : 0.8,
    })),
    ...blogSlugs.map((slug) => ({
      url: `${siteConfig.url}/blog/${slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
