import type { ProfilePageContent } from "@/shared/types/content";

export const homePageContent: ProfilePageContent = {
  monogram: "PAWA",
  name: "Prasetya Adi Wijaya",
  title: "Design Engineer building PORTO with editorial discipline and product-level polish.",
  status: "Open for selected builds",
  metaLine: "text-3xl text-zinc-950 dark:text-zinc-50 font-medium",
  avatarUrl: "/avatar.png",
  overview: [
    { left: { icon: "code", value: "Design Engineer @PORTO" } },
    { left: { icon: "lightbulb", value: "Founder @PORTO" } },
    {
      left: { icon: "mapPin", value: "Makassar, Indonesia" },
      right: { icon: "clock", value: "17:00 // GMT+8" },
    },
    {
      left: { icon: "phone", value: "+62 812 345 6789" },
      right: { icon: "mail", value: "hello@porto.dev" },
    },
    {
      left: { icon: "link", value: "porto.dev" },
      right: { icon: "user", value: "he/him" },
    },
  ],
  socials: [
    { label: "X", href: "https://x.com", detail: "Updates and micro-thoughts" },
    { label: "GitHub", href: "https://github.com", detail: "Code, experiments, and UI systems" },
    { label: "LinkedIn", href: "https://linkedin.com", detail: "Professional notes and background" },
    { label: "daily.dev", href: "https://daily.dev", detail: "Dev bookmarks and reads" },
    { label: "Discord", href: "https://discord.gg", detail: "Community and discussions" },
    { label: "YouTube", href: "https://youtube.com", detail: "Walkthroughs and showcases" },
  ],
  about: [
    "PORTO is being shaped as a minimalist technical profile surface: high signal, thin borders, disciplined spacing, and dense information arranged like a product sheet rather than a fluffy landing page.",
    "The reference from chanhdai.com pushes a strong idea: make the interface feel engineered, not decorative. This version adapts that language into PORTO with a profile-first composition, modular rows, and tighter information rhythm.",
  ],
  principles: [
    {
      label: "Visual Rule",
      value: "Monochrome + thin borders",
      note: "Texture stays subtle and only supports structure, never stealing the scene.",
    },
    {
      label: "Layout Rule",
      value: "Boxed 768px frame",
      note: "Sections read like one continuous editorial system with consistent vertical rails.",
    },
    {
      label: "Product Rule",
      value: "Server-first by default",
      note: "Interactive islands exist only where they improve the experience, not by accident.",
    },
  ],
  testimonials: [
    {
      quote: "The strongest part is the restraint. It feels deliberate, not random-polished.",
      author: "Rizky",
      role: "Product Designer",
    },
    {
      quote: "This direction turns a personal site into something that feels like a well-structured interface.",
      author: "Nadia",
      role: "Frontend Engineer",
    },
    {
      quote: "The grid, spacing, and borders do the heavy lifting. Nice. Quiet. Sharp.",
      author: "Farhan",
      role: "Creative Technologist",
    },
  ],
  partners: ["Vercel-adjacent", "shadcn/ui", "Next.js", "Tailwind CSS", "Radix UI", "Lucide"],
  stack: [
    "Next.js 16",
    "React 19",
    "TypeScript",
    "Tailwind CSS v4",
    "shadcn/ui",
    "Radix UI",
    "Lucide",
    "Playwright",
    "Vercel",
  ],
  components: [
    {
      title: "Profile Header Grid",
      description: "A boxed profile intro using split rows, monospaced meta labels, and rail-aligned borders.",
      meta: "Header / Foundation",
      hrefLabel: "Open component",
    },
    {
      title: "Data-Heavy Section Sheets",
      description: "Sections read like compact product sheets: readable, structured, and intentionally dense.",
      meta: "Section / Content",
      hrefLabel: "Open component",
    },
    {
      title: "Editorial Card Previews",
      description: "Dark preview blocks balance the otherwise light monochrome canvas and mimic the reference rhythm.",
      meta: "Card / Showcase",
      hrefLabel: "Open component",
    },
  ],
  writing: [
    {
      title: "Build the system before the page",
      description: "Why tokens, rails, and content rhythm should settle before adding more sections.",
      meta: "Essay / UI Systems",
      hrefLabel: "Read article",
    },
    {
      title: "How to make a portfolio feel engineered",
      description: "Notes on using structure, spacing, and quiet texture to get a more technical editorial result.",
      meta: "Notes / Design",
      hrefLabel: "Read article",
    },
  ],
  experience: [
    {
      period: "2025 — Now",
      title: "Building PORTO",
      detail: "Designing and implementing a documentation-driven frontend foundation for a portfolio and internal skill system.",
    },
    {
      period: "2023 — 2025",
      title: "Frontend Product Work",
      detail: "Worked on modular UI systems, landing surfaces, and admin-facing interfaces with a strong focus on maintainability.",
    },
  ],
  projects: [
    {
      period: "01",
      title: "Editorial Homepage System",
      detail: "Reframed the homepage from generic marketing sections into a compact profile sheet inspired by chanhdai.com.",
    },
    {
      period: "02",
      title: "Monolith with strict UI boundaries",
      detail: "Kept route composition in app/, domain work in modules/, and reusable UI inside shared/components.",
    },
    {
      period: "03",
      title: "Playwright-driven visual QA",
      detail: "Used before/after snapshots as a working loop instead of hoping the browser agrees later. Browser dulu, ego belakangan 😄",
    },
  ],
  awards: [
    {
      period: "2026",
      title: "Internal Direction Lock",
      detail: "PORTO docs, frontend structure, and visual implementation finally speak the same language.",
    },
    {
      period: "2025",
      title: "Design System Discipline",
      detail: "Established a practical rule set for grid, borders, and restrained motion before scaling content.",
    },
  ],
  certifications: [
    {
      period: "UI",
      title: "Accessible interaction baseline",
      detail: "Keyboard focus, readable density, and structured semantics remain part of the build bar.",
    },
    {
      period: "DX",
      title: "Modular monolith setup",
      detail: "Local skills, docs, and frontend code are organized to support iteration without chaos.",
    },
  ],
  bookmarks: [
    {
      period: "01",
      title: "Layout rhythm over visual noise",
      detail: "The strongest mood often comes from spacing, alignment, and borders, not from adding more stuff.",
    },
    {
      period: "02",
      title: "Reference with adaptation",
      detail: "Copying the concept works better than copying every pixel; otherwise it becomes cosplay with CSS.",
    },
  ],
};
