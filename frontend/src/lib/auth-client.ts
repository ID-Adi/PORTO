import { createAuthClient } from "better-auth/react";

import { BACKEND_URL } from "./backend-url";

export const authClient = createAuthClient({ baseURL: BACKEND_URL });
