import type { SkillCategory } from "./types";

export const skillCategories: SkillCategory[] = [
  {
    title: "Frontend",
    skills: [
      { name: "React", level: 5, description: "Component architecture, hooks, state management, performance optimization", years: 5 },
      { name: "Next.js", level: 5, description: "App Router, SSR/SSG, API routes, middleware, ISR", years: 4 },
      { name: "TypeScript", level: 5, description: "Advanced types, generics, utility types, strict mode", years: 4 },
      { name: "Tailwind CSS", level: 5, description: "Utility-first design, custom plugins, responsive design", years: 3 },
      { name: "HTML/CSS", level: 5, description: "Semantic markup, accessibility, animations, grid/flexbox", years: 6 },
    ],
  },
  {
    title: "Backend",
    skills: [
      { name: "Node.js", level: 4, description: "REST APIs, WebSocket, streams, worker threads", years: 5 },
      { name: "PostgreSQL", level: 4, description: "Query optimization, indexing, migrations, stored procedures", years: 4 },
      { name: "Redis", level: 3, description: "Caching strategies, pub/sub, session management", years: 3 },
      { name: "GraphQL", level: 3, description: "Schema design, resolvers, subscriptions, federation", years: 2 },
    ],
  },
  {
    title: "DevOps & Cloud",
    skills: [
      { name: "Docker", level: 4, description: "Multi-stage builds, compose, networking, optimization", years: 4 },
      { name: "AWS", level: 4, description: "ECS, Lambda, S3, CloudFront, RDS, IAM", years: 3 },
      { name: "CI/CD", level: 4, description: "GitHub Actions, automated testing, deployment pipelines", years: 4 },
      { name: "Vercel", level: 5, description: "Edge functions, analytics, preview deployments", years: 3 },
    ],
  },
  {
    title: "Tools & Workflow",
    skills: [
      { name: "Git", level: 5, description: "Branching strategies, rebasing, hooks, monorepo management", years: 6 },
      { name: "Figma", level: 3, description: "Design tokens, component libraries, prototyping", years: 3 },
      { name: "Playwright", level: 4, description: "E2E testing, visual regression, CI integration", years: 2 },
      { name: "Storybook", level: 4, description: "Component documentation, visual testing, addons", years: 3 },
    ],
  },
  {
    title: "Architecture & Patterns",
    skills: [
      { name: "Design Systems", level: 4, description: "Token-based theming, component APIs, documentation", years: 3 },
      { name: "Monorepo", level: 4, description: "Turborepo, workspace management, shared packages", years: 3 },
      { name: "Testing", level: 4, description: "Unit, integration, E2E, TDD, coverage strategies", years: 5 },
      { name: "Performance", level: 4, description: "Core Web Vitals, bundle analysis, lazy loading, caching", years: 4 },
    ],
  },
];
