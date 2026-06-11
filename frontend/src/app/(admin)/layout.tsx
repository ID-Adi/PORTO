import type { ReactNode } from "react";

import { createNoIndexMetadata } from "@/lib/seo";

import "../globals.css";

export const metadata = createNoIndexMetadata(
  "Private Area",
  "Private administration area for PORTO."
);

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return children;
}
