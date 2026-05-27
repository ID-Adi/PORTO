import { redirect } from "next/navigation";

const DEFAULT_EXCALIDRAW_URL = "http://localhost:3002";

export default function ExcalidrawRedirectPage() {
  redirect(
    process.env.EXCALIDRAW_URL ??
      process.env.NEXT_PUBLIC_EXCALIDRAW_URL ??
      DEFAULT_EXCALIDRAW_URL
  );
}
