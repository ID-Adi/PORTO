import type { ContributionGraphData } from "@/features/home/types/contributions";

export type ProfileFact = {
  label: string;
  value: string;
  note?: string;
};

export type TestimonialItem = {
  quote: string;
  author: string;
  role: string;
  avatarUrl?: string;
};

export type SponsorItem = {
  name: string;
  href: string;
  meta: string;
};

export type StackItem = {
  name: string;
  slug: string;
  version?: string;
};

export type TimelineItem = {
  period: string;
  title: string;
  detail: string;
  href?: string;
  author?: string;
  bookmarkedAt?: string;
};

export type ReadingItem = {
  title: string;
  excerpt: string;
  link: string;
  domain: string;
  createdAt: string;
  tags: string[];
};

export type ProfilePageContent = {
  monogram: string;
  name: string;
  title: string;
  status: string;
  metaLine: string;
  pronunciationText?: string;
  avatarUrl: string;
  flipSentences: string[];
  about: string[];
  testimonials: TestimonialItem[];
  contributions: ContributionGraphData;
  sponsors: SponsorItem[];
  stack: StackItem[];
  awards: TimelineItem[];
  certifications: TimelineItem[];
  bookmarks: TimelineItem[];
};
