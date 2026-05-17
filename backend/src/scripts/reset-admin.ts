import { auth } from "../auth/index.js";
import { db } from "../db/index.js";
import { account, session, user } from "../db/schema/index.js";

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env");
  }

  // Clear existing auth rows. session & account cascade on user delete, but
  // we wipe explicitly first in case orphans remain from previous resets.
  await db.delete(session);
  await db.delete(account);
  await db.delete(user);

  await auth.api.signUpEmail({
    body: { email, password, name: "Admin" },
  });

  console.log(`Admin reset: ${email}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
