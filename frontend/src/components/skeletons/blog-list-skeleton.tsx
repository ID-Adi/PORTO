import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton untuk daftar artikel di /blog (dan loading.tsx-nya).
 * Dimensi meniru <article> di blog/page.tsx agar tidak ada layout shift.
 */
export function BlogListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-4 border-b border-(--line) px-4 py-5 last:border-b-0 sm:px-5"
        >
          <Skeleton className="size-16 shrink-0 rounded-md" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="mt-1 h-3 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}
