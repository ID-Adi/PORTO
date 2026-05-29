import { router } from "../init.js";
import { aiSettingsRouter } from "./ai-settings.js";
import { blogRouter } from "./blog.js";
import { bookmarksRouter } from "./bookmarks.js";
import { canvasRouter } from "./canvas.js";
import { contactRouter } from "./contact.js";
import { experiencesRouter } from "./experiences.js";
import { mediaRouter } from "./media.js";
import { profileOverviewRouter } from "./profile-overview.js";
import { projectsRouter } from "./projects.js";
import { siteSettingsRouter } from "./site-settings.js";
import { skillsRouter } from "./skills.js";
import { socialsRouter } from "./socials.js";
import { toolsRouter } from "./tools.js";

export const appRouter = router({
  aiSettings: aiSettingsRouter,
  projects: projectsRouter,
  skills: skillsRouter,
  blog: blogRouter,
  experiences: experiencesRouter,
  contact: contactRouter,
  siteSettings: siteSettingsRouter,
  media: mediaRouter,
  profileOverview: profileOverviewRouter,
  socials: socialsRouter,
  bookmarks: bookmarksRouter,
  canvas: canvasRouter,
  tools: toolsRouter,
});

export type AppRouter = typeof appRouter;
