import { SiteShell } from "@/layout/site-shell";
import { ProjectsListSkeleton } from "@/components/skeletons/projects-list-skeleton";

export default function ProjectsLoading() {
  return (
    <SiteShell>
      <div className="page-frame border-x border-(--line)">
        <section>
          <header className="screen-line-bottom px-4 py-6 sm:px-5">
            <h1 className="text-3xl font-semibold tracking-tight">Projects</h1>
          </header>
          <ProjectsListSkeleton />
        </section>
      </div>
    </SiteShell>
  );
}
