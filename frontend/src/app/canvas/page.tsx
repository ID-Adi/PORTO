import type { Metadata } from "next";

import { SiteHeader } from "@/layout/site-header";
import { CanvasClient } from "./canvas-client";

export const metadata: Metadata = {
  title: "Canvas",
  description: "Whiteboard kanvas untuk sketsa dan catatan visual.",
  robots: { index: false, follow: false },
};

export default function CanvasPage() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <SiteHeader />
      <CanvasClient />
    </div>
  );
}
