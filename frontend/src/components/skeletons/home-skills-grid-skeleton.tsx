import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton untuk section "Skills" di homepage (grid 3 kolom kartu).
 * Meniru SkillsSection di features/home/sections/skills-section.tsx.
 * Catatan: BERBEDA dari SkillsRouteSkeleton (grup collapsible di /skills).
 */
export function HomeSkillsGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-0 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "px-4 py-4 sm:px-5",
            index > 0 && "border-t border-(--line) lg:border-t-0 lg:border-l",
            index >= 3 && "lg:border-t",
          )}
        >
          <Skeleton className="h-3 w-20" />
          <div className="mt-1 flex items-center justify-between gap-2">
            <Skeleton className="h-4 w-28" />
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="size-1.5 rounded-full" />
              ))}
            </div>
          </div>
          <Skeleton className="mt-3 h-3 w-full" />
        </div>
      ))}
    </div>
  );
}
