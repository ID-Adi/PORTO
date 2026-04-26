import { createAuthClient } from "better-auth/react";

const baseURL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4001";

export const authClient = createAuthClient({ baseURL });
