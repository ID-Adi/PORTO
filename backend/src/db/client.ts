import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { databaseSchema } from "./index";

let database:
  | ReturnType<typeof drizzle<typeof databaseSchema>>
  | undefined;

export function getDatabase() {
  const databaseUrl =
    process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/porto";

  if (!database) {
    const client = postgres(databaseUrl, {
      prepare: false,
    });

    database = drizzle(client, { schema: databaseSchema });
  }

  return database;
}
