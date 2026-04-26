import type { ReactNode } from "react";

import "../globals.css";

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <div className="admin-theme font-sans antialiased">{children}</div>;
}
