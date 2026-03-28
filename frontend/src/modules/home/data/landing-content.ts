import type {
  ContactContent,
  CraftRule,
  HeroContent,
  ProcessStep,
  ProjectHighlight,
  SummaryItem,
} from "@/shared/types/content";

export const homePageContent: {
  hero: HeroContent;
  summary: SummaryItem[];
  projects: ProjectHighlight[];
  process: ProcessStep[];
  rules: CraftRule[];
  contact: ContactContent;
} = {
  hero: {
    badge: "PORTO UI/UX Direction",
    title: "Minimalist technical portfolio built as a small design system.",
    description:
      "This first pass focuses on the interface language before feature depth: tight grid rhythm, thin borders, restrained motion, and modular sections inspired by the PORTO docs and the Chanh Dai reference.",
    location: "Monolith project, modular frontend architecture",
    highlights: ["Next.js + TypeScript", "Tailwind CSS", "shadcn/ui-ready"],
    primaryCta: "Review selected work",
    secondaryCta: "Read architecture notes",
  },
  summary: [
    {
      title: "Visual System",
      meta: "Tokens first",
      description:
        "Monochrome surfaces, editorial spacing, thin borders, and subtle dot or hatch textures.",
    },
    {
      title: "Architecture",
      meta: "Monolith / modular",
      description:
        "Single app in one repository root, with routing in app/ and domain logic isolated by module.",
    },
    {
      title: "Dummy Content",
      meta: "Fast iteration",
      description:
        "Temporary data lives beside the module it serves so UI exploration stays fast before CMS or API work.",
    },
    {
      title: "Quality Bar",
      meta: "Not optional",
      description:
        "Accessibility, responsive behavior, performance discipline, and content consistency stay part of the baseline.",
    },
  ],
  projects: [
    {
      title: "Editorial Landing System",
      summary:
        "A homepage direction that treats border rhythm, spacing scale, and typography hierarchy as first-class system decisions.",
      metric: "01 / foundation pass",
      tags: ["Grid discipline", "Thin border", "Subtle texture"],
    },
    {
      title: "Component-Ready Portfolio Shell",
      summary:
        "A modular monolith that keeps route composition in app/ and domain sections in modules/ so new pages can grow without layout drift.",
      metric: "02 / modular setup",
      tags: ["App Router", "Feature modules", "Shared primitives"],
    },
    {
      title: "Performance-Aware UI Layer",
      summary:
        "A design direction that stays visually detailed without falling into heavy animation, excessive client components, or decorative noise.",
      metric: "03 / quality pass",
      tags: ["Light motion", "Server-first", "Content discipline"],
    },
  ],
  process: [
    {
      step: "01",
      title: "Define the visual grammar",
      body:
        "Lock the monochrome palette, spacing rhythm, border behavior, and type hierarchy before expanding into more sections.",
    },
    {
      step: "02",
      title: "Compose reusable sections",
      body:
        "Build hero, work, process, and contact blocks as reusable section modules so each addition strengthens the system instead of fragmenting it.",
    },
    {
      step: "03",
      title: "Harden interaction quality",
      body:
        "Add accessible states, responsive handling, and restrained motion only after the static composition already feels stable and intentional.",
    },
  ],
  rules: [
    {
      title: "Build the system before the pages",
      body:
        "Tokens, spacing, borders, section shells, and card primitives should settle first so later sections feel like one product, not stitched templates.",
    },
    {
      title: "Use texture as support, not decoration",
      body:
        "Dot grids and diagonal hatch patterns should stay low-contrast and reinforce the engineered feel instead of competing with content.",
    },
    {
      title: "Prefer modular domains over global sprawl",
      body:
        "Keep page composition in app/, keep section logic in modules/, and keep reusable primitives in shared/ so the monolith remains maintainable as the portfolio expands.",
    },
  ],
  contact: {
    title: "Use this foundation to shape the next PORTO sections.",
    description:
      "The current homepage is still using dummy content, but the structure is now ready for real narrative, project entries, and richer interaction design on top of the same visual system.",
    primaryCta: "Continue homepage build",
    secondaryCta: "Inspect frontend structure",
  },
};
