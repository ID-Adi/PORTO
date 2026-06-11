import { getPublicBlogPosts } from "@/features/public-data/server";
import { createRouteMetadata } from "@/lib/seo";

import { BlogPageClient } from "./blog-page-client";

const BLOG_DESCRIPTION =
  "Tulisan teknis, catatan eksplorasi, laporan pasar Saham & Crypto, dan catatan belajar.";

export const metadata = createRouteMetadata({
  title: "Blog",
  description: BLOG_DESCRIPTION,
  path: "/blog",
});

export default async function BlogPage() {
  // Prefetch list kategori default (global) di server — ISR 60 detik — supaya
  // HTML awal berisi daftar artikel, bukan skeleton. Saat fetch gagal, client
  // component fallback ke fetch sendiri.
  const initialPosts = await getPublicBlogPosts("global");

  return <BlogPageClient initialPosts={initialPosts ?? undefined} />;
}
