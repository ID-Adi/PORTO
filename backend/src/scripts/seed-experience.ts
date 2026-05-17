import { eq } from "drizzle-orm";

import { db } from "../db/index.js";
import {
  experienceCompanies,
  experiencePositions,
} from "../db/schema/index.js";

type PositionSeed = {
  title: string;
  period: string;
  description: string;
  achievements: string[];
  technologies: string[];
  sortOrder: number;
};

type CompanySeed = {
  name: string;
  location: string;
  isCurrent: boolean;
  sortOrder: number;
  positions: PositionSeed[];
};

const seedData: CompanySeed[] = [
  {
    name: "PORTO Studio",
    location: "Remote",
    isCurrent: true,
    sortOrder: 10,
    positions: [
      {
        title: "Lead Design Engineer",
        period: "2024 – Present",
        description:
          "Leading the design engineering practice, building and maintaining the portfolio system with strict visual boundaries and editorial design principles.",
        achievements: [
          "Architected monolith portfolio with Next.js 16, Tailwind CSS v4, and shadcn/ui",
          "Established design token system reducing visual inconsistencies by 80%",
          "Implemented Playwright-driven visual QA pipeline",
          "Achieved Lighthouse score 95+ across all categories",
        ],
        technologies: ["Next.js", "TypeScript", "Tailwind CSS", "Playwright", "Vercel"],
        sortOrder: 10,
      },
    ],
  },
  {
    name: "TechCorp",
    location: "Jakarta, Indonesia",
    isCurrent: false,
    sortOrder: 20,
    positions: [
      {
        title: "Senior Frontend Engineer",
        period: "2022 – 2024",
        description:
          "Led frontend architecture for enterprise SaaS platform serving 50k+ daily active users. Drove migration from legacy codebase to modern React stack.",
        achievements: [
          "Reduced page load time from 4.2s to 1.1s via code splitting and lazy hydration",
          "Built real-time dashboard handling 5k concurrent WebSocket connections",
          "Mentored team of 4 junior developers through structured code reviews",
          "Introduced component library adopted by 3 product teams",
        ],
        technologies: ["React", "TypeScript", "Node.js", "WebSocket", "D3.js", "Redis"],
        sortOrder: 10,
      },
    ],
  },
  {
    name: "StartupXYZ",
    location: "Bandung, Indonesia",
    isCurrent: false,
    sortOrder: 30,
    positions: [
      {
        title: "Frontend Engineer",
        period: "2020 – 2022",
        description:
          "Full-stack development for e-commerce platform. Owned the checkout flow rebuild that improved conversion rates significantly.",
        achievements: [
          "Rebuilt checkout flow improving conversion rate by 23%",
          "Reduced checkout steps from 5 to 2 with progressive disclosure",
          "Integrated 3 payment gateways with unified error handling",
          "A/B tested 4 layout variants over 60 days",
        ],
        technologies: ["Next.js", "React", "Stripe", "PostgreSQL", "Tailwind CSS"],
        sortOrder: 10,
      },
    ],
  },
  {
    name: "Digital Agency Co",
    location: "Jakarta, Indonesia",
    isCurrent: false,
    sortOrder: 40,
    positions: [
      {
        title: "Web Developer",
        period: "2019 – 2020",
        description:
          "Developed responsive websites and web applications for various clients across industries including finance, healthcare, and education.",
        achievements: [
          "Delivered 12+ client projects on time and within budget",
          "Built reusable component library reducing development time by 35%",
          "Implemented accessibility standards achieving WCAG 2.1 AA compliance",
        ],
        technologies: ["React", "Vue.js", "SCSS", "WordPress", "PHP"],
        sortOrder: 10,
      },
    ],
  },
  {
    name: "Freelance",
    location: "Remote",
    isCurrent: false,
    sortOrder: 50,
    positions: [
      {
        title: "Web Developer",
        period: "2018 – 2019",
        description:
          "Independent web development practice building websites and applications for small businesses and startups.",
        achievements: [
          "Completed 20+ projects across various industries",
          "Built custom CMS solutions for content-heavy websites",
          "Established long-term relationships with 5 recurring clients",
        ],
        technologies: ["HTML", "CSS", "JavaScript", "PHP", "MySQL"],
        sortOrder: 10,
      },
    ],
  },
];

async function seed() {
  console.log(`Seeding ${seedData.length} companies...`);
  for (const c of seedData) {
    const { positions, ...companyData } = c;
    const [existing] = await db
      .select()
      .from(experienceCompanies)
      .where(eq(experienceCompanies.name, c.name))
      .limit(1);
    if (existing) {
      console.log(`  · ${c.name} (skip, exists)`);
      continue;
    }
    const [company] = await db
      .insert(experienceCompanies)
      .values(companyData)
      .returning();

    for (const p of positions) {
      await db.insert(experiencePositions).values({ ...p, companyId: company.id });
    }

    console.log(`  ✓ ${c.name} (${positions.length} position${positions.length > 1 ? "s" : ""})`);
  }
  console.log("Done!");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
