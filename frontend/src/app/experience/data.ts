import type { ExperienceItem } from "./types";

export const experiences: ExperienceItem[] = [
  {
    company: "PORTO Studio",
    role: "Lead Design Engineer",
    period: "2024 – Present",
    location: "Remote",
    description: "Leading the design engineering practice, building and maintaining the portfolio system with strict visual boundaries and editorial design principles.",
    achievements: [
      "Architected monolith portfolio with Next.js 16, Tailwind CSS v4, and shadcn/ui",
      "Established design token system reducing visual inconsistencies by 80%",
      "Implemented Playwright-driven visual QA pipeline",
      "Achieved Lighthouse score 95+ across all categories",
    ],
    technologies: ["Next.js", "TypeScript", "Tailwind CSS", "Playwright", "Vercel"],
  },
  {
    company: "TechCorp",
    role: "Senior Frontend Engineer",
    period: "2022 – 2024",
    location: "Jakarta, Indonesia",
    description: "Led frontend architecture for enterprise SaaS platform serving 50k+ daily active users. Drove migration from legacy codebase to modern React stack.",
    achievements: [
      "Reduced page load time from 4.2s to 1.1s via code splitting and lazy hydration",
      "Built real-time dashboard handling 5k concurrent WebSocket connections",
      "Mentored team of 4 junior developers through structured code reviews",
      "Introduced component library adopted by 3 product teams",
    ],
    technologies: ["React", "TypeScript", "Node.js", "WebSocket", "D3.js", "Redis"],
  },
  {
    company: "StartupXYZ",
    role: "Frontend Engineer",
    period: "2020 – 2022",
    location: "Bandung, Indonesia",
    description: "Full-stack development for e-commerce platform. Owned the checkout flow rebuild that improved conversion rates significantly.",
    achievements: [
      "Rebuilt checkout flow improving conversion rate by 23%",
      "Reduced checkout steps from 5 to 2 with progressive disclosure",
      "Integrated 3 payment gateways with unified error handling",
      "A/B tested 4 layout variants over 60 days",
    ],
    technologies: ["Next.js", "React", "Stripe", "PostgreSQL", "Tailwind CSS"],
  },
  {
    company: "Digital Agency Co",
    role: "Web Developer",
    period: "2019 – 2020",
    location: "Jakarta, Indonesia",
    description: "Developed responsive websites and web applications for various clients across industries including finance, healthcare, and education.",
    achievements: [
      "Delivered 12+ client projects on time and within budget",
      "Built reusable component library reducing development time by 35%",
      "Implemented accessibility standards achieving WCAG 2.1 AA compliance",
    ],
    technologies: ["React", "Vue.js", "SCSS", "WordPress", "PHP"],
  },
  {
    company: "Freelance",
    role: "Web Developer",
    period: "2018 – 2019",
    location: "Remote",
    description: "Independent web development practice building websites and applications for small businesses and startups.",
    achievements: [
      "Completed 20+ projects across various industries",
      "Built custom CMS solutions for content-heavy websites",
      "Established long-term relationships with 5 recurring clients",
    ],
    technologies: ["HTML", "CSS", "JavaScript", "PHP", "MySQL"],
  },
];
