import { siteConfig } from "@/config/site";

export async function GET() {
  const posts: Array<{ title: string; description: string; slug: string }> = [];

  const items = posts
    .map(
      (post) => `
        <item>
          <title><![CDATA[${post.title}]]></title>
          <description><![CDATA[${post.description}]]></description>
          <link>${siteConfig.url}/blog/${post.slug}</link>
          <guid>${siteConfig.url}/blog/${post.slug}</guid>
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
