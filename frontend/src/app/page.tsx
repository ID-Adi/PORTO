import { homePageContent } from "@/modules/home/data/landing-content";
import { ContactCta } from "@/modules/home/sections/contact-cta";
import { CraftRules } from "@/modules/home/sections/craft-rules";
import { HeroSection } from "@/modules/home/sections/hero";
import { ProcessTimeline } from "@/modules/home/sections/process-timeline";
import { SummaryGrid } from "@/modules/home/sections/summary-grid";
import { WorkShowcase } from "@/modules/home/sections/work-showcase";
import { SiteShell } from "@/shared/ui/site-shell";

export default function HomePage() {
  return (
    <SiteShell>
      <HeroSection content={homePageContent.hero} />
      <SummaryGrid items={homePageContent.summary} />
      <WorkShowcase items={homePageContent.projects} />
      <ProcessTimeline steps={homePageContent.process} />
      <CraftRules content={homePageContent.rules} />
      <ContactCta content={homePageContent.contact} />
    </SiteShell>
  );
}
