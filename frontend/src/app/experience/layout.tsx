import { createRouteMetadata } from "@/lib/seo";

export const metadata = createRouteMetadata({
  title: "Experience",
  description: "Career timeline, roles, and resume.",
  path: "/experience",
});

export default function ExperienceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
