import { redirect } from "next/navigation";

const DEFAULT_EXCALIDRAW_URL = "/canvas";

export default function ExcalidrawRedirectPage() {
  redirect(
    process.env.EXCALIDRAW_URL ??
      process.env.NEXT_PUBLIC_EXCALIDRAW_URL ??
      DEFAULT_EXCALIDRAW_URL
  );
}
