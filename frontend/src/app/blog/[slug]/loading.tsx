import { SiteShell } from "@/layout/site-shell";
import { BlogPostSkeleton } from "@/components/skeletons/blog-post-skeleton";

export default function BlogPostLoading() {
  return (
    <SiteShell>
      <div className="page-frame border-x border-(--line)">
        <BlogPostSkeleton />
      </div>
    </SiteShell>
  );
}
