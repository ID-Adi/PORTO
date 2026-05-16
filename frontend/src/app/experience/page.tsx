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

import { experiences } from "./data";
import type { ExperienceItem } from "./types";

function CompanyIcon() {
  return (
    <div className="relative size-10 shrink-0 overflow-hidden rounded-full border border-(--line) bg-zinc-950">
      <svg className="absolute inset-0 size-full opacity-40" aria-hidden="true">
        <pattern id="exp-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="4" stroke="white" strokeWidth="1" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#exp-hatch)" />
      </svg>
    </div>
  );
}

function ExperienceRow({ item }: { item: ExperienceItem }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border-b border-(--line)">
        <div className="flex items-center gap-4 px-4 py-4 sm:px-5">
          <CompanyIcon />
          <div className="h-10 border-l border-dotted border-(--line)" />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium tracking-[-0.03em]">{item.role}</h3>
            <p className="mt-0.5 font-mono text-xs text-(--muted-foreground)">
              {item.company} · {item.period}
            </p>
          </div>
          <CollapsibleTrigger className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-(--muted-foreground) transition-colors hover:text-(--foreground)">
            <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <div className="border-t border-(--line) px-4 py-5 sm:px-5 sm:pl-[4.5rem]">
            <p className="text-sm leading-relaxed text-(--muted-foreground)">{item.description}</p>
            {item.achievements.length > 0 && (
              <ul className="mt-4 space-y-2">
                {item.achievements.map((a) => (
                  <li key={a} className="flex gap-2 text-sm leading-relaxed">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-(--foreground)" />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            )}
            {item.technologies.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {item.technologies.map((tag) => (
                  <span key={tag} className="rounded-full border border-(--line) px-3 py-0.5 font-mono text-xs text-(--muted-foreground)">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export default function ExperiencePage() {
  return (
    <SiteShell>
      <div className="page-frame border-x border-(--line)">
        <section className="screen-line-top screen-line-bottom">
          <header className="screen-line-bottom px-4 py-6 sm:px-5">
            <h1 className="text-3xl font-semibold tracking-tight">
              Experience
              <sup className="-top-[0.75em] ml-1 text-sm font-medium tracking-normal text-(--muted-foreground)">
                ({experiences.length})
              </sup>
            </h1>
          </header>
          <div>
            {experiences.map((item) => (
              <ExperienceRow key={item.company + item.period} item={item} />
            ))}
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
