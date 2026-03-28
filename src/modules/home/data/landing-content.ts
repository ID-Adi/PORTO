import type {
  CraftRule,
  HeroContent,
  SummaryItem,
} from "@/shared/types/content";

export const homePageContent: {
  hero: HeroContent;
  summary: SummaryItem[];
  rules: CraftRule[];
} = {
  hero: {
    badge: "PORTO UI/UX Direction",
    title: "Minimalist technical portfolio built as a small design system.",
    description:
      "This first pass focuses on the interface language before feature depth: tight grid rhythm, thin borders, restrained motion, and modular sections inspired by the PORTO docs and the Chanh Dai reference.",
    location: "Monolith project, modular frontend architecture",
    highlights: ["Next.js + TypeScript", "Tailwind CSS", "shadcn/ui-ready"],
  },
  summary: [
    {
      title: "Visual System",
      description:
        "Monochrome surfaces, editorial spacing, thin borders, and subtle dot or hatch textures.",
    },
    {
      title: "Architecture",
      description:
        "Single app in one repository root, with routing in app/ and domain logic isolated by module.",
    },
    {
      title: "Dummy Content",
      description:
        "Temporary data lives beside the module it serves so UI exploration stays fast before CMS or API work.",
    },
    {
      title: "Quality Bar",
      description:
        "Accessibility, responsive behavior, performance discipline, and content consistency stay part of the baseline.",
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
};

