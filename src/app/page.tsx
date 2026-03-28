import { homePageContent } from "@/modules/home/data/landing-content";
import { CraftRules } from "@/modules/home/sections/craft-rules";
import { HeroSection } from "@/modules/home/sections/hero";
import { SummaryGrid } from "@/modules/home/sections/summary-grid";
import { SiteShell } from "@/shared/ui/site-shell";

export default function HomePage() {
  return (
    <SiteShell>
      <HeroSection content={homePageContent.hero} />
      <SummaryGrid items={homePageContent.summary} />
      <CraftRules content={homePageContent.rules} />
    </SiteShell>
  );
}

