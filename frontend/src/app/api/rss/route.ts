import { siteConfig } from "@/config/site";
import { getBlogCategoryLabel } from "@/features/public-data/blog-meta";
import { getPublicBlogPosts } from "@/features/public-data/server";

function cdata(value: string | null | undefined): string {
  return `<![CDATA[${(value ?? "").replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;
}

export async function GET() {
  const posts = (await getPublicBlogPosts()) ?? [];

  const items = posts
    .map(
      (post) => `
        <item>
          <title>${cdata(post.title)}</title>
          <description>${cdata(post.description)}</description>
          <link>${siteConfig.url}/blog/${post.slug}</link>
          <guid>${siteConfig.url}/blog/${post.slug}</guid>
          <category>${cdata(getBlogCategoryLabel(post.category))}</category>
          <pubDate>${new Date(post.publishedAt ?? post.createdAt).toUTCString()}</pubDate>
        </item>
      `
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${siteConfig.name}</title>
    <description>${siteConfig.description}</description>
    <link>${siteConfig.url}</link>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
