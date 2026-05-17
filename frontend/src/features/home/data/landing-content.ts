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
