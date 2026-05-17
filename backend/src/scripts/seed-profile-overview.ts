import { eq, and } from "drizzle-orm";

import { db } from "../db/index.js";
import { profileOverview } from "../db/schema/index.js";

type Seed = {
  position: "lead" | "left" | "right";
  icon: string;
  value: string;
  kind?: "text" | "time";
  copyable?: boolean;
  note?: string;
  sortOrder: number;
};

const seedData: Seed[] = [
  { position: "lead", icon: "code", value: "Design Engineer @ PORTO", sortOrder: 10 },
  { position: "lead", icon: "lightbulb", value: "Founder @ PORTO", sortOrder: 20 },
  { position: "left", icon: "mapPin", value: "Banjarbaru, Indonesia", sortOrder: 30 },
  { position: "right", icon: "clock", value: "Asia/Makassar", kind: "time", note: "WITA", sortOrder: 30 },
  { position: "left", icon: "phone", value: "+62 858 2080 0495", copyable: true, sortOrder: 40 },
  { position: "right", icon: "mail", value: "contact@pawa.dev", copyable: true, sortOrder: 40 },
  { position: "left", icon: "link", value: "porto.dev", sortOrder: 50 },
  { position: "right", icon: "user", value: "he/him", sortOrder: 50 },
];

async function seed() {
  console.log(`Seeding ${seedData.length} overview rows...`);
  for (const r of seedData) {
    const [existing] = await db
      .select()
      .from(profileOverview)
      .where(
        and(
          eq(profileOverview.icon, r.icon),
          eq(profileOverview.value, r.value),
        ),
      )
      .limit(1);
    if (existing) {
      console.log(`  · ${r.icon}=${r.value} (skip, exists)`);
      continue;
    }
    await db.insert(profileOverview).values({
      position: r.position,
      icon: r.icon,
      value: r.value,
      kind: r.kind ?? "text",
      copyable: r.copyable ?? false,
      note: r.note ?? null,
      sortOrder: r.sortOrder,
    });
    console.log(`  ✓ ${r.icon} → ${r.value}`);
  }
  console.log("Done!");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
