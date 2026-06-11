import { createRouteMetadata } from "@/lib/seo";

export const metadata = createRouteMetadata({
  title: "Projects",
  description: "Selected work and case studies built by PORTO.",
  path: "/projects",
});

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
