import { eq } from "drizzle-orm";

import { db } from "../db/index.js";
import { siteSettings } from "../db/schema/index.js";

const SINGLETON_ID = 1;

const defaults = {
  profileName: "Prasetya Adi Wijaya",
  profileTitle:
    "Design Engineer building PORTO with editorial discipline and product-level polish.",
  logoUrl: null as string | null,
};

async function main() {
  const [existing] = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.id, SINGLETON_ID))
    .limit(1);

  if (existing) {
    console.log(`Site settings already exists (id=${SINGLETON_ID})`);
    return;
  }

  await db.insert(siteSettings).values({
    id: SINGLETON_ID,
    ...defaults,
  });

  console.log("Site settings seeded with defaults");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
