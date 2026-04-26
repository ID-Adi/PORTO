import type { ReactNode } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
};

export function DataTable<T extends { id: number | string }>({
  columns,
  rows,
  empty,
}: {
  columns: Column<T>[];
  rows: T[] | undefined;
  empty?: string;
}) {
  if (!rows) {
    return (
      <div className="rounded-md border border-(--border) bg-(--card) p-6 text-sm text-(--muted-foreground)">
        Loading…
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-(--border) bg-(--card) p-6 text-center text-sm text-(--muted-foreground)">
        {empty ?? "No records yet."}
      </div>
    );
  }
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
          {rows.map((row) => (
            <TableRow key={row.id}>
              {columns.map((c) => (
                <TableCell key={c.key} className={c.className}>
                  {c.render(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
