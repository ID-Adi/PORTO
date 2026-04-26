import { createTRPCReact } from "@trpc/react-query";

import type { AppRouter } from "@porto/api";

export const trpc = createTRPCReact<AppRouter>();
