import { eq } from "drizzle-orm";

import { db } from "../db/index.js";
import { skills } from "../db/schema/index.js";

type SkillSeed = {
  name: string;
  category: string;
  level: number;
  description: string;
  years: number;
  sortOrder: number;
};

const seedData: SkillSeed[] = [
  // Frontend
  { name: "React", category: "frontend", level: 5, description: "Component architecture, hooks, state management, performance optimization", years: 5, sortOrder: 10 },
  { name: "Next.js", category: "frontend", level: 5, description: "App Router, SSR/SSG, API routes, middleware, ISR", years: 4, sortOrder: 11 },
  { name: "TypeScript", category: "frontend", level: 5, description: "Advanced types, generics, utility types, strict mode", years: 4, sortOrder: 12 },
  { name: "Tailwind CSS", category: "frontend", level: 5, description: "Utility-first design, custom plugins, responsive design", years: 3, sortOrder: 13 },
  { name: "HTML/CSS", category: "frontend", level: 5, description: "Semantic markup, accessibility, animations, grid/flexbox", years: 6, sortOrder: 14 },

  // Backend
  { name: "Node.js", category: "backend", level: 4, description: "REST APIs, WebSocket, streams, worker threads", years: 5, sortOrder: 20 },
  { name: "PostgreSQL", category: "backend", level: 4, description: "Query optimization, indexing, migrations, stored procedures", years: 4, sortOrder: 21 },
  { name: "Redis", category: "backend", level: 3, description: "Caching strategies, pub/sub, session management", years: 3, sortOrder: 22 },
  { name: "GraphQL", category: "backend", level: 3, description: "Schema design, resolvers, subscriptions, federation", years: 2, sortOrder: 23 },

  // DevOps & Cloud
  { name: "Docker", category: "devops", level: 4, description: "Multi-stage builds, compose, networking, optimization", years: 4, sortOrder: 30 },
  { name: "AWS", category: "devops", level: 4, description: "ECS, Lambda, S3, CloudFront, RDS, IAM", years: 3, sortOrder: 31 },
  { name: "CI/CD", category: "devops", level: 4, description: "GitHub Actions, automated testing, deployment pipelines", years: 4, sortOrder: 32 },
  { name: "Vercel", category: "devops", level: 5, description: "Edge functions, analytics, preview deployments", years: 3, sortOrder: 33 },

  // Tools & Workflow
  { name: "Git", category: "tools", level: 5, description: "Branching strategies, rebasing, hooks, monorepo management", years: 6, sortOrder: 40 },
  { name: "Figma", category: "tools", level: 3, description: "Design tokens, component libraries, prototyping", years: 3, sortOrder: 41 },
  { name: "Playwright", category: "tools", level: 4, description: "E2E testing, visual regression, CI integration", years: 2, sortOrder: 42 },
  { name: "Storybook", category: "tools", level: 4, description: "Component documentation, visual testing, addons", years: 3, sortOrder: 43 },

  // Architecture & Patterns
  { name: "Design Systems", category: "architecture", level: 4, description: "Token-based theming, component APIs, documentation", years: 3, sortOrder: 50 },
  { name: "Monorepo", category: "architecture", level: 4, description: "Turborepo, workspace management, shared packages", years: 3, sortOrder: 51 },
  { name: "Testing", category: "architecture", level: 4, description: "Unit, integration, E2E, TDD, coverage strategies", years: 5, sortOrder: 52 },
  { name: "Performance", category: "architecture", level: 4, description: "Core Web Vitals, bundle analysis, lazy loading, caching", years: 4, sortOrder: 53 },
];

async function seed() {
  console.log(`Seeding ${seedData.length} skills...`);
  for (const s of seedData) {
    const [existing] = await db
      .select()
      .from(skills)
      .where(eq(skills.name, s.name))
      .limit(1);
    if (existing) {
      console.log(`  · ${s.name} (skip, exists)`);
      continue;
    }
    await db.insert(skills).values(s);
    console.log(`  ✓ ${s.name}`);
  }
  console.log("Done!");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
