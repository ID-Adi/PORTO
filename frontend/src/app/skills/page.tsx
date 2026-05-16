"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { SiteShell } from "@/layout/site-shell";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import { skillCategories } from "./data";
import type { SkillCategory, SkillItem } from "./types";

function SkillIcon() {
  return (
    <div className="relative size-8 shrink-0 overflow-hidden rounded-full border border-(--line) bg-zinc-950">
      <svg className="absolute inset-0 size-full opacity-40" aria-hidden="true">
        <pattern id="skill-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="4" stroke="white" strokeWidth="1" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#skill-hatch)" />
      </svg>
    </div>
  );
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

function SkillRow({ skill }: { skill: SkillItem }) {
  return (
    <div className="flex items-center gap-3 border-b border-(--line) px-4 py-3 last:border-b-0 sm:px-5">
      <SkillIcon />
      <div className="border-l border-dotted border-(--line) h-8" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium tracking-[-0.03em]">{skill.name}</h3>
          <ProficiencyDots level={skill.level} />
        </div>
        <p className="mt-0.5 text-[12px] leading-relaxed text-(--muted-foreground)">{skill.description}</p>
      </div>
    </div>
  );
}

function CategorySection({ category }: { category: SkillCategory }) {
  const [open, setOpen] = useState(true);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border-b border-(--line)">
        <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-4 sm:px-5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-[-0.03em]">{category.title}</h2>
            <span className="font-mono text-[11px] text-(--muted-foreground)">({category.skills.length})</span>
          </div>
          <ChevronDown className={cn("size-4 text-(--muted-foreground) transition-transform", open && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-(--line)">
            {category.skills.map((skill) => (
              <SkillRow key={skill.name} skill={skill} />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

const totalSkills = skillCategories.reduce((acc, cat) => acc + cat.skills.length, 0);

export default function SkillsPage() {
  return (
    <SiteShell>
      <div className="page-frame border-x border-(--line)">
        <section className="screen-line-top screen-line-bottom">
          <header className="screen-line-bottom px-4 py-6 sm:px-5">
            <h1 className="text-3xl font-semibold tracking-tight">
              Skills
              <sup className="-top-[0.75em] ml-1 text-sm font-medium tracking-normal text-(--muted-foreground)">
                ({totalSkills})
              </sup>
            </h1>
          </header>
          <div>
            {skillCategories.map((category) => (
              <CategorySection key={category.title} category={category} />
            ))}
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
