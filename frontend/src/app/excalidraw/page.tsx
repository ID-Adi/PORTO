import { redirect } from "next/navigation";

import { createNoIndexMetadata } from "@/lib/seo";

const DEFAULT_EXCALIDRAW_URL = "/canvas";

export const metadata = createNoIndexMetadata(
  "Excalidraw Redirect",
  "Internal redirect to the PORTO canvas workspace."
);

export default function ExcalidrawRedirectPage() {
  redirect(
    process.env.EXCALIDRAW_URL ??
      process.env.NEXT_PUBLIC_EXCALIDRAW_URL ??
      DEFAULT_EXCALIDRAW_URL
  );
}
