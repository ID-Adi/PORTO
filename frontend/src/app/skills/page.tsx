"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { SiteShell } from "@/layout/site-shell";
import { trpc } from "@/lib/trpc";
import { ThumbImage } from "@/components/common/thumb-image";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type Skill = {
  id: number;
  name: string;
  category: string;
  level: number;
  description: string | null;
  iconUrl: string | null;
};

type CategoryGroup = {
  title: string;
  key: string;
  skills: Skill[];
};

const CATEGORY_LABELS: Record<string, string> = {
  frontend: "Frontend",
  backend: "Backend",
  devops: "DevOps & Cloud",
  tools: "Tools & Workflow",
  architecture: "Architecture & Patterns",
  tooling: "Tooling",
  other: "Other",
};

const CATEGORY_ORDER = [
  "frontend",
  "backend",
  "devops",
  "tools",
  "tooling",
  "architecture",
  "other",
];

function groupByCategory(skills: Skill[]): CategoryGroup[] {
  const map = new Map<string, Skill[]>();
  for (const s of skills) {
    const arr = map.get(s.category) ?? [];
    arr.push(s);
    map.set(s.category, arr);
  }
  const groups: CategoryGroup[] = [];
  for (const key of CATEGORY_ORDER) {
    const items = map.get(key);
    if (items?.length) {
      groups.push({ key, title: CATEGORY_LABELS[key] ?? key, skills: items });
      map.delete(key);
    }
  }
  for (const [key, items] of map) {
    groups.push({ key, title: CATEGORY_LABELS[key] ?? key, skills: items });
  }
  return groups;
}

function ProficiencyDots({ level }: { level: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "size-1.5 rounded-full",
            i < level ? "bg-(--foreground)" : "bg-(--line)"
          )}
        />
      ))}
    </div>
  );
}

function SkillRow({ skill }: { skill: Skill }) {
  return (
    <div className="flex items-center gap-3 border-b border-(--line) px-4 py-3 last:border-b-0 sm:px-5">
      <ThumbImage
        src={skill.iconUrl}
        alt={skill.name}
        className="size-8 shrink-0 rounded-full border border-(--line)"
      />
      <div className="border-l border-dotted border-(--line) h-8" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium tracking-[-0.03em]">{skill.name}</h3>
          <ProficiencyDots level={skill.level} />
        </div>
        {skill.description ? (
          <p className="mt-0.5 text-[12px] leading-relaxed text-(--muted-foreground)">{skill.description}</p>
        ) : null}
      </div>
    </div>
  );
}

function CategorySection({ group }: { group: CategoryGroup }) {
  const [open, setOpen] = useState(true);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="block border-b border-(--line) last:border-b-0">
      <div>
        <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-4 sm:px-5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-[-0.03em]">{group.title}</h2>
            <span className="font-mono text-[11px] text-(--muted-foreground)">({group.skills.length})</span>
          </div>
          <ChevronDown className={cn("size-4 text-(--muted-foreground) transition-transform", open && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-(--line)">
            {group.skills.map((skill) => (
              <SkillRow key={skill.id} skill={skill} />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export default function SkillsPage() {
  const { data, isLoading } = trpc.skills.list.useQuery();
  const skills = data ?? [];
  const groups = groupByCategory(skills);
  const totalSkills = skills.length;

  return (
    <SiteShell>
      <div className="page-frame border-x border-(--line)">
        <section>
          <header className="screen-line-bottom px-4 py-6 sm:px-5">
            <h1 className="text-3xl font-semibold tracking-tight">
              Skills
              <sup className="-top-[0.75em] ml-1 text-sm font-medium tracking-normal text-(--muted-foreground)">
                ({totalSkills})
              </sup>
            </h1>
          </header>
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <span className="font-mono text-xs text-(--muted-foreground)">Loading…</span>
            </div>
          ) : groups.length === 0 ? (
            <div className="flex items-center justify-center py-24">
              <span className="text-sm text-(--muted-foreground)">Belum ada skill.</span>
            </div>
          ) : (
            <div>
              {groups.map((group) => (
                <CategorySection key={group.key} group={group} />
              ))}
            </div>
          )}
        </section>
      </div>
    </SiteShell>
  );
}
