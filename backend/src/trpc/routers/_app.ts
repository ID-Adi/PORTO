import { router } from "../init.js";

export const appRouter = router({
  // Add sub-routers here, e.g.:
  // post: postRouter,
});

export type AppRouter = typeof appRouter;
