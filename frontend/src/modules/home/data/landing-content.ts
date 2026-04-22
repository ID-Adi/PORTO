import type {
  ContributionDay,
  ContributionWeek,
  ContributionGraphData,
} from "@/modules/home/types/contributions";
import type {
  ProfilePageContent,
} from "@/shared/types/content";

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
      left: { icon: "mapPin", value: "Makassar, Indonesia" },
      right: { icon: "clock", value: "Asia/Makassar", kind: "time", note: "WITA" },
    },
    {
      left: { icon: "phone", value: "+62 812 345 6789", copyable: true },
      right: { icon: "mail", value: "hello@porto.dev", copyable: true },
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
    "PORTO is being reshaped into a technical editorial profile surface: thin borders, compressed hierarchy, and a layout that feels engineered rather than decorated.",
    "The refactor follows the structural logic from chanhdai.com as closely as possible while keeping the content, identity, and subject matter rooted in PORTO.",
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
  components: [
    {
      title: "Profile Header Grid",
      description:
        "A boxed profile intro using split rows, monospaced meta labels, and rail-aligned borders.",
      meta: "Header / Foundation",
      hrefLabel: "Open component",
    },
    {
      title: "Data-Heavy Section Sheets",
      description:
        "Sections read like compact product sheets: readable, structured, and intentionally dense.",
      meta: "Section / Content",
      hrefLabel: "Open component",
    },
    {
      title: "Editorial Card Previews",
      description:
        "Dark preview blocks balance the otherwise light monochrome canvas and mirror the reference rhythm.",
      meta: "Card / Showcase",
      hrefLabel: "Open component",
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
      period: "2025 — Now",
      title: "Building PORTO",
      detail:
        "Designing and implementing a documentation-driven frontend foundation for a portfolio and internal skill system.",
    },
    {
      period: "2023 — 2025",
      title: "Frontend Product Work",
      detail:
        "Worked on modular UI systems, landing surfaces, and admin-facing interfaces with a strong focus on maintainability.",
    },
  ],
  projects: [
    {
      period: "01",
      title: "Editorial Homepage System",
      detail:
        "Reframed the homepage from generic marketing sections into a compact profile sheet inspired by chanhdai.com.",
    },
    {
      period: "02",
      title: "Monolith with strict UI boundaries",
      detail:
        "Kept route composition in app/, domain work in modules/, and reusable UI inside shared/components.",
    },
    {
      period: "03",
      title: "Playwright-driven visual QA",
      detail:
        "Used before/after snapshots as a working loop instead of hoping the browser agrees later. Browser dulu, ego belakangan 😄",
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
      period: "01",
      title: "Layout rhythm over visual noise",
      detail:
        "The strongest mood often comes from spacing, alignment, and borders, not from adding more stuff.",
    },
    {
      period: "02",
      title: "Reference with adaptation",
      detail:
        "The implementation follows the reference structure tightly, but keeps the content unmistakably PORTO.",
    },
  ],
};
