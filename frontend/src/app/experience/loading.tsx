import { SiteShell } from "@/layout/site-shell";
import { ExperienceListSkeleton } from "@/components/skeletons/experience-list-skeleton";

export default function ExperienceLoading() {
  return (
    <SiteShell>
      <div className="page-frame border-x border-(--line)">
        <section>
          <header className="screen-line-bottom px-4 py-6 sm:px-5">
            <h1 className="text-3xl font-semibold tracking-tight">Experience</h1>
          </header>
          <ExperienceListSkeleton />
        </section>
      </div>
    </SiteShell>
  );
}
