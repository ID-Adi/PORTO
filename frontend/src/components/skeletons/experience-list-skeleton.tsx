import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton baris pengalaman untuk /experience dan section experience homepage.
 * Meniru PositionBlock di experience/page.tsx (avatar + divider titik + judul/periode).
 */
export function ExperienceListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border-b border-(--line) last:border-b-0">
          <div className="flex items-center gap-4 px-4 py-4 sm:px-5">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="h-10 border-l border-dotted border-(--line)" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="mt-1.5 h-3 w-40" />
            </div>
            <Skeleton className="size-8 shrink-0 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
