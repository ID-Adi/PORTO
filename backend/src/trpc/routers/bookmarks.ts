import { listPublicBookmarks } from "../../services/public-data.js";
import { publicProcedure, router } from "../init.js";

export const bookmarksRouter = router({
  list: publicProcedure.query(() => listPublicBookmarks()),
});
