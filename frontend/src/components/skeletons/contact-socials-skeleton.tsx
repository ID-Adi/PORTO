import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton untuk daftar social links di /contact (satu-satunya bagian yang di-fetch).
 * Meniru baris <a> di kolom "Connect" pada contact/page.tsx.
 */
export function ContactSocialsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="mt-4 space-y-3" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between border-b border-(--line) pb-3"
        >
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}
