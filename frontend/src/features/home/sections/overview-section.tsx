"use client";

import {
  PanelContent,
} from "@/layout/panel";
import type { PublicOverviewRow } from "@/features/public-data/types";

import {
  OverviewCell,
  OverviewLeadRow,
  RailSection,
} from "./profile-sheet";

type Row = PublicOverviewRow;

function groupCompact(rows: Row[]): { left: Row; right?: Row }[] {
  const out: { left: Row; right?: Row }[] = [];
  const bySortOrder = new Map<number, { left?: Row; right?: Row }>();
  for (const r of rows) {
    const slot = bySortOrder.get(r.sortOrder) ?? {};
    if (r.position === "left") slot.left = r;
    else if (r.position === "right") slot.right = r;
    bySortOrder.set(r.sortOrder, slot);
  }
  const orderedKeys = [...bySortOrder.keys()].sort((a, b) => a - b);
  for (const k of orderedKeys) {
    const { left, right } = bySortOrder.get(k)!;
    if (left) out.push({ left, right });
    else if (right) out.push({ left: right }); // fallback when only right present
  }
  return out;
}

export function OverviewDbSection({ rows = [] }: { rows?: Row[] }) {
  const leadRows = rows.filter((r) => r.position === "lead");
  const compactPairs = groupCompact(rows.filter((r) => r.position !== "lead"));

  return (
    <RailSection id="overview" title="Overview">
      <PanelContent className="space-y-2.5">
        {leadRows.map((r) => (
          <OverviewLeadRow key={r.id} icon={r.icon} value={r.value} />
        ))}

        <div className="grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
          {compactPairs.map(({ left, right }) => (
            <span key={left.id} className="contents">
              <OverviewCell
                icon={left.icon}
                value={left.value}
                kind={left.kind as "text" | "time"}
                copyable={left.copyable}
                note={left.note ?? undefined}
              />
              {right ? (
                <OverviewCell
                  icon={right.icon}
                  value={right.value}
                  kind={right.kind as "text" | "time"}
                  copyable={right.copyable}
                  note={right.note ?? undefined}
                />
              ) : null}
            </span>
          ))}
        </div>
      </PanelContent>
    </RailSection>
  );
}
