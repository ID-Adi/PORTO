import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistPixelSquare } from "geist/font/pixel";
import { GeistSans } from "geist/font/sans";

import "./globals.css";

const fontVariables = [
  GeistSans.variable,
  GeistMono.variable,
  GeistPixelSquare.variable,
  "[--font-sans:var(--font-geist-sans)]",
  "[--font-mono:var(--font-geist-mono)]",
].join(" ");

export const metadata: Metadata = {
  title: "PORTO",
  description: "Minimalist technical portfolio exploration for PORTO.",
};

const themeScript = String.raw`
  try {
    const storedTheme = localStorage.getItem("porto-theme");
    const resolvedTheme = storedTheme
      ? storedTheme === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;

    document.documentElement.classList.toggle("dark", resolvedTheme);
  } catch (_) {}
`;

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="en"
      className={fontVariables}
      suppressHydrationWarning
    >
      <head>
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
      </head>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
