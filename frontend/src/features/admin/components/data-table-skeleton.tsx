import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { Column } from "./data-table";

/**
 * Skeleton tabel admin. Memakai header asli (string) + placeholder per sel
 * sehingga semua halaman list admin mendapat skeleton lewat satu titik wiring
 * di data-table.tsx (cabang `rows` belum tersedia).
 */
export function DataTableSkeleton<T>({
  columns,
  rows = 6,
}: {
  columns: Column<T>[];
  rows?: number;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-(--border) bg-(--card)">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead key={c.key} className={c.className}>
                {c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, r) => (
            <TableRow key={r}>
              {columns.map((c) => (
                <TableCell key={c.key} className={c.className}>
                  <Skeleton className="h-4 w-full max-w-[160px]" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
