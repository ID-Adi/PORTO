import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Skills",
  description: "Tech stack, tools, and areas of expertise.",
};

export default function SkillsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
