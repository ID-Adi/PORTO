import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects",
  description: "Selected work and case studies built by PORTO.",
};

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
