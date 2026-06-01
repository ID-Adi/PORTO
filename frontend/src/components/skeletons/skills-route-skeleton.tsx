import { Skeleton } from "@/components/ui/skeleton";

function SkillRowSkeleton() {
  return (
    <div className="flex items-center gap-3 border-b border-(--line) px-4 py-3 last:border-b-0 sm:px-5">
      <Skeleton className="size-8 shrink-0 rounded-full" />
      <div className="h-8 border-l border-dotted border-(--line)" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-4 w-40" />
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="size-1.5 rounded-full" />
            ))}
          </div>
        </div>
        <Skeleton className="mt-1.5 h-3 w-3/4" />
      </div>
    </div>
  );
}

/**
 * Skeleton untuk halaman /skills yang memakai grup kategori collapsible.
 * Meniru CategorySection + SkillRow di skills/page.tsx.
 * Catatan: BERBEDA dari HomeSkillsGridSkeleton (grid 3 kolom di homepage).
 */
export function SkillsRouteSkeleton({
  groups = 3,
  rowsPerGroup = 3,
}: {
  groups?: number;
  rowsPerGroup?: number;
}) {
  return (
    <div aria-hidden>
      {Array.from({ length: groups }).map((_, g) => (
        <div key={g} className="border-b border-(--line) last:border-b-0">
          <div className="flex w-full items-center justify-between px-4 py-4 sm:px-5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="size-4 rounded-sm" />
          </div>
          <div className="border-t border-(--line)">
            {Array.from({ length: rowsPerGroup }).map((_, r) => (
              <SkillRowSkeleton key={r} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
