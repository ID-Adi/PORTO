export type ProfileFact = {
  label: string;
  value: string;
  note?: string;
};

export type OverviewCell = {
  icon: string;
  value: string;
};

export type OverviewRow = {
  left: OverviewCell;
  right?: OverviewCell;
};

export type SocialLinkItem = {
  label: string;
  href: string;
  detail: string;
};

export type TestimonialItem = {
  quote: string;
  author: string;
  role: string;
};

export type ShowcaseCard = {
  title: string;
  description: string;
  meta: string;
  hrefLabel: string;
};

export type SponsorItem = {
  name: string;
  href: string;
  meta: string;
};

export type ContributionDay = {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
};

export type TimelineItem = {
  period: string;
  title: string;
  detail: string;
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
  overview: OverviewRow[];
  socials: SocialLinkItem[];
  about: string[];
  testimonials: TestimonialItem[];
  contributions: ContributionDay[];
  sponsors: SponsorItem[];
  stack: string[];
  components: ShowcaseCard[];
  blog: ShowcaseCard[];
  experience: TimelineItem[];
  projects: TimelineItem[];
  awards: TimelineItem[];
  certifications: TimelineItem[];
  bookmarks: TimelineItem[];
};
