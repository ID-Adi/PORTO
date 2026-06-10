import type { Metadata } from "next";

import { siteConfig } from "@/config/site";
import { getPublicBlogPosts } from "@/features/public-data/server";

import { BlogPageClient } from "./blog-page-client";

const BLOG_URL = `${siteConfig.url.replace(/\/$/, "")}/blog`;

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Tulisan teknis, catatan eksplorasi, laporan pasar Saham & Crypto, dan catatan belajar.",
  alternates: { canonical: BLOG_URL },
  openGraph: {
    type: "website",
    title: "Blog",
    description:
      "Tulisan teknis, catatan eksplorasi, laporan pasar Saham & Crypto, dan catatan belajar.",
    url: BLOG_URL,
    siteName: siteConfig.name,
  },
};

export default async function BlogPage() {
  // Prefetch list kategori default (global) di server — ISR 60 detik — supaya
  // HTML awal berisi daftar artikel, bukan skeleton. Saat fetch gagal, client
  // component fallback ke fetch sendiri.
  const initialPosts = await getPublicBlogPosts("global");

  return <BlogPageClient initialPosts={initialPosts ?? undefined} />;
}
