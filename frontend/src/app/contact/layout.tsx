import { createRouteMetadata } from "@/lib/seo";

export const metadata = createRouteMetadata({
  title: "Contact",
  description:
    "Contact Prasetya Adi Wijaya for project inquiries, collaboration, hiring, and PORTO work.",
  path: "/contact",
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
