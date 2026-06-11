import { createRouteMetadata } from "@/lib/seo";

export const metadata = createRouteMetadata({
  title: "Skills",
  description: "Tech stack, tools, and areas of expertise.",
  path: "/skills",
});

export default function SkillsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
