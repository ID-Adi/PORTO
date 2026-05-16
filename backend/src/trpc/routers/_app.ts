import { router } from "../init.js";
import { blogRouter } from "./blog.js";
import { contactRouter } from "./contact.js";
import { experiencesRouter } from "./experiences.js";
import { projectsRouter } from "./projects.js";
import { siteSettingsRouter } from "./site-settings.js";
import { skillsRouter } from "./skills.js";

export const appRouter = router({
  projects: projectsRouter,
  skills: skillsRouter,
  blog: blogRouter,
  experiences: experiencesRouter,
  contact: contactRouter,
  siteSettings: siteSettingsRouter,
});

export type AppRouter = typeof appRouter;
