import type { Metadata } from "next";

import { siteConfig } from "@/config/site";

export const siteUrl = siteConfig.url.replace(/\/$/, "");

type RouteMetadataInput = {
  title: string;
  description: string;
  path: `/${string}`;
};

export function absoluteUrl(path: string) {
  return `${siteUrl}${path}`;
}

export function createRouteMetadata({
  title,
  description,
  path,
}: RouteMetadataInput): Metadata {
  const url = absoluteUrl(path);
  const ogImageUrl = new URL(siteConfig.ogImage, siteUrl).toString();

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title,
      description,
      url,
      siteName: siteConfig.name,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${siteConfig.name} - ${title}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      creator: siteConfig.creator,
      images: [ogImageUrl],
    },
  };
}

export function createNoIndexMetadata(title: string, description: string): Metadata {
  return {
    title,
    description,
    robots: {
      index: false,
      follow: false,
    },
  };
}
