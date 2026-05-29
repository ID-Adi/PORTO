import type { Metadata } from "next";

import { CanvasShell } from "./canvas-shell";

export const metadata: Metadata = {
  title: "Canvas",
  description: "Whiteboard kanvas untuk sketsa dan catatan visual.",
  robots: { index: false, follow: false },
};

export default function CanvasPage() {
  return <CanvasShell />;
}
