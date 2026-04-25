import { homePageContent } from "@/features/home/data/landing-content";
import { ProfileSheet } from "@/features/home/sections/profile-sheet";
import { SiteShell } from "@/layout/site-shell";

export default function HomePage() {
  return (
    <SiteShell>
      <div className="page-frame *:[[id]]:scroll-mt-24">
        <ProfileSheet content={homePageContent} />
      </div>
    </SiteShell>
  );
}
