import { Hono } from "hono";

import { BLOG_CATEGORIES, type BlogCategory } from "../db/schema/index.js";
import {
  getPublicCommandData,
  getPublicHomeData,
  getPublicSiteSettings,
  getPublishedBlogPostBySlug,
  listPublicBlogPosts,
  listPublicExperience,
  listPublicProjects,
  listPublicSkills,
  listPublicSocials,
} from "../services/public-data.js";

async function withFallback<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[public-data] Falling back to empty response:", message);
    return fallback;
  }
}

export const publicDataRoute = new Hono()
  .get("/home", async (c) => c.json(await getPublicHomeData()))
  .get("/site-settings", async (c) => {
    const settings = await withFallback(getPublicSiteSettings(), null);
    return c.json(settings);
  })
  .get("/command", async (c) => c.json(await getPublicCommandData()))
  .get("/projects", async (c) => {
    const projects = await withFallback(listPublicProjects(), []);
    return c.json(projects);
  })
  .get("/skills", async (c) => {
    const skills = await withFallback(listPublicSkills(), []);
    return c.json(skills);
  })
  .get("/experience", async (c) => {
    const experience = await withFallback(listPublicExperience(), []);
    return c.json(experience);
  })
  .get("/blog", async (c) => {
    const rawCategory = c.req.query("category");
    let category: BlogCategory | undefined;
    if (rawCategory !== undefined) {
      if (!(BLOG_CATEGORIES as readonly string[]).includes(rawCategory)) {
        return c.json({ error: "Invalid category" }, 400);
      }
      category = rawCategory as BlogCategory;
    }
    const blog = await withFallback(listPublicBlogPosts(category), []);
    return c.json(blog);
  })
  .get("/blog/:slug", async (c) => {
    const post = await withFallback(
      getPublishedBlogPostBySlug(c.req.param("slug")),
      null,
    );
    return c.json(post);
  })
  .get("/contact", async (c) => {
    const socials = await withFallback(listPublicSocials(), []);
    return c.json({ socials });
  });
