import type {
  ContributionDay,
  ContributionWeek,
  ContributionGraphData,
} from "@/features/home/types/contributions";
import type {
  ProfilePageContent,
} from "@/types/content";

const fallbackContributionColors = [
  "rgba(24, 24, 27, 0.08)",
  "rgba(24, 24, 27, 0.18)",
  "rgba(24, 24, 27, 0.3)",
  "rgba(24, 24, 27, 0.44)",
  "rgba(24, 24, 27, 0.6)",
];

function buildContributionData(): ContributionGraphData {
  const weeks: ContributionWeek[] = [];
  let total = 0;
  const today = new Date();
  const start = new Date(today);

  start.setDate(today.getDate() - 51 * 7 - today.getDay());

  for (let weekIndex = 0; weekIndex < 52; weekIndex += 1) {
    const contributionDays: ContributionDay[] = [];

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const current = new Date(start);
      current.setDate(start.getDate() + weekIndex * 7 + dayIndex);

      const level = ((weekIndex * 3 + dayIndex * 2) % 5) as 0 | 1 | 2 | 3 | 4;
      const contributionCount = level === 0 ? 0 : level * 2 + (dayIndex % 2);

      total += contributionCount;
      contributionDays.push({
        date: current.toISOString().slice(0, 10),
        contributionCount,
        color: fallbackContributionColors[level],
      });
    }

    weeks.push({ contributionDays });
  }

  return {
    totalContributions: total,
    weeks,
  };
}

export const homePageContent: ProfilePageContent = {
  monogram: "PAWA",
  name: "Prasetya Adi Wijaya",
  title:
    "Design Engineer building PORTO with editorial discipline and product-level polish.",
  status: "Open for selected builds",
  metaLine: "text-3xl text-zinc-950 dark:text-zinc-50 font-medium",
  pronunciationText: "Prasetya Adi Wijaya",
  avatarUrl: "/avatar.png",
  flipSentences: [
    "Building PORTO with editorial discipline.",
    "Shipping profile surfaces with product-level polish.",
    "Thin borders, quiet texture, strong hierarchy.",
  ],
  overview: [
    { left: { icon: "code", value: "Design Engineer @ PORTO" } },
    { left: { icon: "lightbulb", value: "Founder @ PORTO" } },
    {
      left: { icon: "mapPin", value: "Banjarbaru, Indonesia" },
      right: { icon: "clock", value: "Asia/Makassar", kind: "time", note: "WITA" },
    },
    {
      left: { icon: "phone", value: "+62 858 2080 0495", copyable: true },
      right: { icon: "mail", value: "contact@pawa.dev", copyable: true },
    },
    {
      left: { icon: "link", value: "porto.dev" },
      right: { icon: "user", value: "he/him" },
    },
  ],
  socials: [
    { label: "X", href: "https://x.com", detail: "Updates and micro-thoughts" },
    {
      label: "GitHub",
      href: "https://github.com",
      detail: "Code, experiments, and UI systems",
    },
    {
      label: "LinkedIn",
      href: "https://linkedin.com",
      detail: "Professional notes and background",
    },
    {
      label: "daily.dev",
      href: "https://daily.dev",
      detail: "Dev bookmarks and reads",
    },
    {
      label: "Discord",
      href: "https://discord.gg",
      detail: "Community and discussions",
    },
    {
      label: "YouTube",
      href: "https://youtube.com",
      detail: "Walkthroughs and showcases",
    },
  ],
  about: [
    "Content Creator sekaligus Full Stack Developer dengan 3 tahun pengalaman di perusahaan distributor — mengelola dua ranah yang berbeda namun saling memperkuat: kreativitas visual dan rekayasa perangkat lunak.",
    "Di sisi kreatif, saya mengelola iklan digital (TikTok Ads, Google Ads, Meta Ads), branding, kerjasama eksternal, serta produksi video dan desain grafis. Latar belakang pendidikan DKV menjadi pondasi kuat dalam membangun identitas visual yang efektif dan komunikatif.",
    "Di bidang IT, saya membangun sistem ERP perusahaan dari nol — satu database yang terintegrasi antara web dan mobile. Sistem ini mencakup alur bisnis lengkap: penjualan, persediaan, pembelian, perpajakan, laporan keuangan, kalkulasi HPP, hingga audit. Kerangka logika bisnis dikembangkan mengacu pada sistem Accurate.",
    "Pekerja keras, selalu up to date dengan perkembangan teknologi, dan aktif memanfaatkan AI dalam keseharian.",
  ],
  testimonials: [
    {
      quote:
        "The strongest part is the restraint. It feels deliberate, not random-polished.",
      author: "Rizky",
      role: "Product Designer",
    },
    {
      quote:
        "This direction turns a personal site into something that feels like a well-structured interface.",
      author: "Nadia",
      role: "Frontend Engineer",
    },
    {
      quote:
        "The grid, spacing, and borders do the heavy lifting. Nice. Quiet. Sharp.",
      author: "Farhan",
      role: "Creative Technologist",
    },
    {
      quote:
        "PORTO reads like a product surface, not a scrapbook. Itu pujian, bukan roasting 😄",
      author: "Aulia",
      role: "Design Systems Lead",
    },
    {
      quote:
        "The interaction polish adds confidence without breaking the editorial calm.",
      author: "Dea",
      role: "Frontend Architect",
    },
    {
      quote:
        "The new direction feels premium because the details stay disciplined.",
      author: "Bagas",
      role: "Product Engineer",
    },
    // TODO: replace with real testimonial
    {
      quote:
        "This is the kind of personal site that makes implementation choices feel intentional.",
      author: "Tara",
      role: "UX Writer",
    },
  ],
  contributions: buildContributionData(),
  sponsors: [
    {
      name: "Next.js",
      href: "https://nextjs.org",
      meta: "Framework foundation",
    },
    {
      name: "Vercel",
      href: "https://vercel.com",
      meta: "Deployment and preview workflow",
    },
    {
      name: "shadcn/ui",
      href: "https://ui.shadcn.com",
      meta: "Component baseline",
    },
    {
      name: "Tailwind CSS",
      href: "https://tailwindcss.com",
      meta: "Styling system",
    },
  ],
  stack: [
    { name: "Next.js", slug: "nextdotjs", version: "16" },
    { name: "React", slug: "react", version: "19" },
    { name: "TypeScript", slug: "typescript", version: "5" },
    { name: "Tailwind CSS", slug: "tailwindcss", version: "v4" },
    { name: "shadcn/ui", slug: "shadcnui" },
    { name: "Radix UI", slug: "radixui" },
    { name: "Lucide", slug: "lucide" },
    { name: "Playwright", slug: "playwright" },
    { name: "Vercel", slug: "vercel" },
  ],
  skills: [
    {
      title: "Profile Header Grid",
      description:
        "A boxed profile intro using split rows, monospaced meta labels, and rail-aligned borders.",
      meta: "Header / Foundation",
      hrefLabel: "Open skill",
    },
    {
      title: "Data-Heavy Section Sheets",
      description:
        "Sections read like compact product sheets: readable, structured, and intentionally dense.",
      meta: "Section / Content",
      hrefLabel: "Open skill",
    },
    {
      title: "Editorial Card Previews",
      description:
        "Dark preview blocks balance the otherwise light monochrome canvas and mirror the reference rhythm.",
      meta: "Card / Showcase",
      hrefLabel: "Open skill",
    },
  ],
  blog: [
    {
      title: "Build the system before the page",
      description:
        "Why tokens, rails, and content rhythm should settle before adding more sections.",
      meta: "Essay / UI Systems",
      hrefLabel: "Read article",
    },
    {
      title: "How to make a portfolio feel engineered",
      description:
        "Notes on using structure, spacing, and quiet texture to get a more technical editorial result.",
      meta: "Notes / Design",
      hrefLabel: "Read article",
    },
  ],
  experience: [
    {
      id: "porto",
      companyName: "PORTO",
      companyWebsite: "https://porto.dev",
      isCurrentEmployer: true,
      positions: [
        {
          id: "building-porto",
          title: "Building PORTO",
          employmentPeriod: {
            start: "2025",
          },
          employmentType: "Product Build",
          description:
            "Designing and implementing a documentation-driven frontend foundation for a portfolio and internal skill system.",
          skills: ["Next.js", "Tailwind CSS", "shadcn/ui", "Design System"],
          isExpanded: true,
        },
        {
          id: "frontend-product-work",
          title: "Frontend Product Work",
          employmentPeriod: {
            start: "2023",
            end: "2025",
          },
          employmentType: "Frontend",
          description:
            "Worked on modular UI systems, landing surfaces, and admin-facing interfaces with a strong focus on maintainability.",
          skills: ["React", "TypeScript", "UI Systems", "Maintainability"],
        },
      ],
    },
  ],
  projects: [
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
  ],
  awards: [
    {
      period: "2026",
      title: "Internal Direction Lock",
      detail:
        "PORTO docs, frontend structure, and visual implementation finally speak the same language.",
    },
    {
      period: "2025",
      title: "Design System Discipline",
      detail:
        "Established a practical rule set for grid, borders, and restrained motion before scaling content.",
    },
  ],
  certifications: [
    {
      period: "UI",
      title: "Accessible interaction baseline",
      detail:
        "Keyboard focus, readable density, and structured semantics remain part of the build bar.",
    },
    {
      period: "DX",
      title: "Modular monolith setup",
      detail:
        "Local skills, docs, and frontend code are organized to support iteration without chaos.",
    },
  ],
  bookmarks: [
    {
      period: "2026-04-21",
      title: "Layout rhythm over visual noise",
      detail: "Spacing, alignment, and borders before adding more stuff.",
      author: "PORTO notes",
      href: "https://vercel.com/design/guidelines",
      bookmarkedAt: "2026-04-21",
    },
    {
      period: "2026-04-18",
      title: "Reference with adaptation",
      detail: "Borrow the structure, keep the content unmistakably PORTO.",
      author: "Implementation memo",
      href: "https://chanhdai.com",
      bookmarkedAt: "2026-04-18",
    },
  ],
};
