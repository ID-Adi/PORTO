import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton baris project (collapsible) untuk /projects dan section projects homepage.
 * `withDivider` mengaktifkan divider titik-titik seperti ProjectRow di homepage
 * (projects-section.tsx). Halaman /projects tidak memakai divider.
 */
export function ProjectsListSkeleton({
  count = 4,
  withDivider = false,
}: {
  count?: number;
  withDivider?: boolean;
}) {
  return (
    <div aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border-b border-(--line) last:border-b-0">
          <div className="flex items-center gap-4 px-4 py-4 sm:px-5">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            {withDivider ? (
              <div className="h-10 border-l border-dotted border-(--line)" />
            ) : null}
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="mt-1.5 h-3 w-24" />
            </div>
            <Skeleton className="size-8 shrink-0 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
