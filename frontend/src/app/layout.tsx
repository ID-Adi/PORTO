import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistPixelSquare } from "geist/font/pixel";
import { GeistSans } from "geist/font/sans";
import NextTopLoader from "nextjs-toploader";

import { homePageContent } from "@/features/home/data/landing-content";
import { siteConfig } from "@/config/site";
import { AppProviders } from "@/context/app-providers";
import { ScrollToTop } from "@/layout/scroll-to-top";

import "./globals.css";

const fontVariables = [
  GeistSans.variable,
  GeistMono.variable,
  GeistPixelSquare.variable,
  "[--font-sans:var(--font-geist-sans)]",
  "[--font-mono:var(--font-geist-mono)]",
].join(" ");

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  alternates: {
    canonical: "/",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    type: "website",
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    creator: siteConfig.creator,
    images: [siteConfig.ogImage],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a1a" },
  ],
};

type RootLayoutProps = {
  children: React.ReactNode;
};

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: homePageContent.name,
  url: siteConfig.url,
  image: new URL(homePageContent.avatarUrl, siteConfig.url).toString(),
  jobTitle: "Design Engineer",
  worksFor: {
    "@type": "Organization",
    name: "PORTO",
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteConfig.name,
  url: siteConfig.url,
  description: siteConfig.description,
};

const structuredDataJson = JSON.stringify([personJsonLd, websiteJsonLd]).replace(
  /</g,
  "\\u003c"
);

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="en"
      className={fontVariables}
      data-theme="light"
      style={{ colorScheme: "light" }}
      suppressHydrationWarning
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: structuredDataJson }}
        />
      </head>
      <body suppressHydrationWarning>
        {/* Top loading bar — indikator transisi rute (warna gold pastel) */}
        <NextTopLoader
          color="#E6C87D"
          height={3}
          showSpinner={false}
          shadow="0 0 10px #E6C87D,0 0 5px #E6C87D"
          easing="ease"
          speed={300}
        />
        <AppProviders>
          {children}
        </AppProviders>
        <ScrollToTop />
      </body>
    </html>
  );
}
