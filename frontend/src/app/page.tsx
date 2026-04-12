import { homePageContent } from "@/modules/home/data/landing-content";
import { ProfileSheet } from "@/modules/home/sections/profile-sheet";
import { SiteShell } from "@/shared/ui/site-shell";

export default function HomePage() {
  return (
    <SiteShell>
      <div className="page-frame *:[[id]]:scroll-mt-24">
        <ProfileSheet content={homePageContent} />
      </div>
    </SiteShell>
  );
}
