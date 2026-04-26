import { eq } from "drizzle-orm";

import { auth } from "../auth/index.js";
import { db } from "../db/index.js";
import { user } from "../db/schema/index.js";

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env");
  }

  const [existing] = await db
    .select()
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  if (existing) {
    console.log(`Admin already exists: ${email}`);
    return;
  }

  await auth.api.signUpEmail({
    body: { email, password, name: "Admin" },
  });

  console.log(`Admin created: ${email}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
