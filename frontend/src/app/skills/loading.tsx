import { SiteShell } from "@/layout/site-shell";
import { SkillsRouteSkeleton } from "@/components/skeletons/skills-route-skeleton";

export default function SkillsLoading() {
  return (
    <SiteShell>
      <div className="page-frame border-x border-(--line)">
        <section>
          <header className="screen-line-bottom px-4 py-6 sm:px-5">
            <h1 className="text-3xl font-semibold tracking-tight">Skills</h1>
          </header>
          <SkillsRouteSkeleton />
        </section>
      </div>
    </SiteShell>
  );
}
