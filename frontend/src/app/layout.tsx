import type { Metadata } from "next";

import "./globals.css";

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
    <html lang="en" suppressHydrationWarning>
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
