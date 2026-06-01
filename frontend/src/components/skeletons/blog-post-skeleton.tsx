import { Skeleton } from "@/components/ui/skeleton";

const CONTENT_LINES = ["w-full", "w-11/12", "w-full", "w-4/5", "w-full", "w-3/4", "w-5/6", "w-2/3"];

/**
 * Skeleton untuk halaman detail artikel /blog/[slug] (dan loading.tsx-nya).
 * Berisi back-link bar, header, dan blok konten — meniru struktur <article>
 * di blog/[slug]/page.tsx. Dipakai juga di cabang isLoading halaman.
 */
export function BlogPostSkeleton() {
  return (
    <article aria-hidden>
      {/* Back link */}
      <div className="screen-line-bottom px-4 py-3 sm:px-5">
        <Skeleton className="h-3 w-28" />
      </div>

      {/* Header */}
      <header className="screen-line-bottom px-4 py-6 sm:px-5">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="mt-3 h-7 w-3/4" />
        <Skeleton className="mt-2 h-4 w-1/2" />
      </header>

      {/* Content */}
      <div className="px-4 py-8 sm:px-5">
        <div className="flex flex-col gap-3">
          {CONTENT_LINES.map((w, i) => (
            <Skeleton key={i} className={`h-4 ${w}`} />
          ))}
        </div>
      </div>
    </article>
  );
}
