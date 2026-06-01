import type { ReadingItem } from "@/types/content";

export type PublicSiteSettings = {
  id: number;
  profileName: string;
  profileTitle: string;
  logoUrl: string | null;
  avatarUrl: string | null;
};

export type PublicOverviewRow = {
  id: number;
  position: string;
  icon: string;
  value: string;
  kind: string;
  copyable: boolean;
  note: string | null;
  sortOrder: number;
};

export type PublicSocial = {
  id: number;
  label: string;
  href: string;
  detail: string | null;
  iconUrl: string | null;
  sortOrder: number;
};

export type PublicSkill = {
  id: number;
  name: string;
  category: string;
  level: number;
  description: string | null;
  years?: number | null;
  iconUrl: string | null;
};

export type PublicBlogPost = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  content: string | null;
  meta: string | null;
  coverUrl: string | null;
  published: boolean;
  publishedAt: Date | string | null;
  createdAt: Date | string;
};

export type PublicExperiencePosition = {
  id: number;
  title: string;
  employmentType: string | null;
  period: string | null;
  description: string | null;
  achievements: string[];
  technologies: string[];
};

export type PublicExperienceCompany = {
  id: number;
  name: string;
  website: string | null;
  location: string | null;
  logoUrl: string | null;
  isCurrent: boolean;
  positions: PublicExperiencePosition[];
};

export type PublicProject = {
  id: number;
  title: string;
  description: string | null;
  period: string | null;
  imageUrl: string | null;
  url: string | null;
  repoUrl: string | null;
  highlights: string[];
  tags: string[];
};

export type PublicHomeData = {
  settings: PublicSiteSettings | null;
  overview: PublicOverviewRow[];
  socials: PublicSocial[];
  skills: PublicSkill[];
  blog: PublicBlogPost[];
  experience: PublicExperienceCompany[];
  projects: PublicProject[];
  bookmarks: ReadingItem[];
};

export type PublicContactData = {
  socials: PublicSocial[];
};

export type PublicCommandData = {
  skills: PublicSkill[];
  blog: PublicBlogPost[];
  socials: PublicSocial[];
};
