import { eq } from "drizzle-orm";

import { db } from "../db/index.js";
import { socials } from "../db/schema/index.js";

const seedData = [
  { label: "X", href: "https://x.com", detail: "Updates and micro-thoughts", sortOrder: 10 },
  { label: "GitHub", href: "https://github.com", detail: "Code, experiments, and UI systems", sortOrder: 20 },
  { label: "LinkedIn", href: "https://linkedin.com", detail: "Professional notes and background", sortOrder: 30 },
  { label: "daily.dev", href: "https://daily.dev", detail: "Dev bookmarks and reads", sortOrder: 40 },
  { label: "Discord", href: "https://discord.gg", detail: "Community and discussions", sortOrder: 50 },
  { label: "YouTube", href: "https://youtube.com", detail: "Walkthroughs and showcases", sortOrder: 60 },
];

async function seed() {
  console.log(`Seeding ${seedData.length} socials...`);
  for (const s of seedData) {
    const [existing] = await db
      .select()
      .from(socials)
      .where(eq(socials.label, s.label))
      .limit(1);
    if (existing) {
      console.log(`  · ${s.label} (skip, exists)`);
      continue;
    }
    await db.insert(socials).values(s);
    console.log(`  ✓ ${s.label}`);
  }
  console.log("Done!");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
