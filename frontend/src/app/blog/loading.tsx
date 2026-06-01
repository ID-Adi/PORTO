import { SiteShell } from "@/layout/site-shell";
import { BlogListSkeleton } from "@/components/skeletons/blog-list-skeleton";

export default function BlogLoading() {
  return (
    <SiteShell>
      <div className="page-frame border-x border-(--line)">
        <section>
          <header className="screen-line-bottom px-4 py-6 sm:px-5">
            <span className="profile-kicker mb-2 block">03 / Blog</span>
            <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              Articles & notes.
            </h1>
            <p className="mt-2 text-sm text-(--muted-foreground)">
              Tulisan teknis, catatan eksplorasi, dan artikel mendalam.
            </p>
          </header>
          <BlogListSkeleton />
        </section>
      </div>
    </SiteShell>
  );
}
