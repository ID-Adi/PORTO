import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Experience",
  description: "Career timeline, roles, and resume.",
};

export default function ExperienceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
