import { homePageContent } from "@/modules/home/data/landing-content";
import { ProfileSheet } from "@/modules/home/sections/profile-sheet";
import { SiteShell } from "@/shared/ui/site-shell";

export default function HomePage() {
  return (
    <SiteShell>
      <ProfileSheet content={homePageContent} />
    </SiteShell>
  );
}
