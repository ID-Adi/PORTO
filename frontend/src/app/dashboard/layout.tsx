import { createNoIndexMetadata } from "@/lib/seo";

export const metadata = createNoIndexMetadata(
  "Dashboard",
  "Private user dashboard for authenticated PORTO sessions."
);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
