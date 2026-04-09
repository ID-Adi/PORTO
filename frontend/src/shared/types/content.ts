export type HeroContent = {
  pixelLogoText: string;
  avatarUrl: string;
  name: string;
  isVerified: boolean;
  title: string;
  infoItems: {
    icon: string;
    text: string;
  }[];
};

export type SummaryItem = {
  title: string;
  description: string;
  meta: string;
};

export type CraftRule = {
  title: string;
  body: string;
};

export type ProjectHighlight = {
  title: string;
  summary: string;
  metric: string;
  tags: string[];
};

export type ProcessStep = {
  step: string;
  title: string;
  body: string;
};

export type ContactContent = {
  title: string;
  description: string;
  primaryCta: string;
  secondaryCta: string;
};

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
  principles: ProfileFact[];
  testimonials: TestimonialItem[];
  partners: string[];
  stack: string[];
  components: ShowcaseCard[];
  writing: ShowcaseCard[];
  experience: TimelineItem[];
  projects: TimelineItem[];
  awards: TimelineItem[];
  certifications: TimelineItem[];
  bookmarks: TimelineItem[];
};
