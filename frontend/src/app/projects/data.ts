import type { ProjectItem } from "./types";

export const projects: ProjectItem[] = [
  {
    title: "PORTO — Personal Portfolio System",
    period: "01.2025 – ∞",
    href: "https://github.com/user/porto",
    description:
      "A monolith portfolio built with Next.js 16, Tailwind CSS v4, and shadcn/ui. Designed as a compact editorial profile sheet with strict visual boundaries.",
    highlights: [
      "Monochrome editorial design system with disciplined spacing and thin borders",
      "Modular monolith structure: app/ for routing, modules/ for domain, shared/ for reusable UI",
      "Playwright-driven visual QA with before/after snapshots",
      "Lighthouse score 95+ across all categories",
    ],
    tags: ["Next.js", "TypeScript", "Tailwind CSS", "shadcn/ui", "Vercel"],
  },
  {
    title: "Internal Design Token Engine",
    period: "06.2024 – 12.2024",
    description:
      "A token-based design system engine that generates consistent spacing, color, and typography scales from a single config source.",
    highlights: [
      "Reduced design inconsistencies by 80% across 12 product screens",
      "Auto-generated Tailwind config from Figma token exports",
      "Supported dark mode, responsive scaling, and brand theming from one source",
    ],
    tags: ["Design Systems", "TypeScript", "Tailwind CSS", "Figma API"],
  },
  {
    title: "Real-time Dashboard Platform",
    period: "03.2024 – 08.2024",
    href: "https://example.com/dashboard",
    description:
      "WebSocket-powered analytics dashboard serving 5k+ concurrent users with sub-200ms update latency.",
    highlights: [
      "Handled 5k concurrent WebSocket connections with horizontal scaling",
      "Built custom charting layer on top of D3 for real-time data streams",
      "Reduced initial load time from 4.2s to 1.1s via code splitting and lazy hydration",
    ],
    tags: ["React", "WebSocket", "D3.js", "Node.js", "Redis"],
  },
  {
    title: "E-Commerce Checkout Rebuild",
    period: "01.2024 – 05.2024",
    description:
      "Complete rewrite of a legacy checkout flow, improving conversion rate by 23% through UX simplification and performance optimization.",
    highlights: [
      "Conversion rate improved from 2.1% to 2.6% (+23%)",
      "Reduced checkout steps from 5 to 2 with progressive disclosure",
      "Integrated 3 payment gateways with unified error handling",
      "A/B tested 4 layout variants over 60 days",
    ],
    tags: ["Next.js", "Stripe", "A/B Testing", "UX"],
  },
  {
    title: "CLI Deployment Tool",
    period: "09.2023 – 02.2024",
    href: "https://github.com/user/deploy-cli",
    description:
      "A zero-config CLI tool for deploying containerized apps to AWS ECS with built-in rollback and health checks.",
    highlights: [
      "Zero-config deployment with convention-based defaults",
      "Built-in rollback on failed health checks within 30s window",
      "Supported multi-region deployments with traffic shifting",
    ],
    tags: ["CLI", "Node.js", "AWS ECS", "Docker", "Open Source"],
  },
  {
    title: "Component Library — Radix Primitives",
    period: "04.2023 – 08.2023",
    description:
      "Accessible component library built on Radix UI primitives with full keyboard navigation and ARIA compliance.",
    highlights: [
      "40+ components with full keyboard and screen reader support",
      "Published to internal npm registry, adopted by 3 product teams",
      "Reduced UI development time by ~35% across teams",
    ],
    tags: ["React", "Radix UI", "Accessibility", "Storybook"],
  },
  {
    title: "Data Pipeline Orchestrator",
    period: "01.2023 – 06.2023",
    description:
      "Event-driven data pipeline processing 2M+ records daily with retry logic, dead-letter queues, and observability.",
    highlights: [
      "Processed 2M+ records/day with 99.7% success rate",
      "Built dead-letter queue with automatic retry and alerting",
      "Integrated OpenTelemetry for end-to-end trace visibility",
    ],
    tags: ["Node.js", "AWS SQS", "Lambda", "OpenTelemetry"],
  },
  {
    title: "Static Site Generator",
    period: "06.2022 – 12.2022",
    href: "https://github.com/user/ssg",
    description:
      "Markdown-first static site generator with incremental builds, plugin system, and sub-second rebuild times.",
    highlights: [
      "Sub-second incremental rebuilds via content hashing",
      "Plugin architecture supporting custom transformers and renderers",
      "Used by 200+ developers in the community",
    ],
    tags: ["TypeScript", "Markdown", "Open Source", "CLI"],
  },
];
