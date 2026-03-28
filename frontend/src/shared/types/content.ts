export type HeroContent = {
  badge: string;
  title: string;
  description: string;
  location: string;
  highlights: string[];
  primaryCta: string;
  secondaryCta: string;
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
