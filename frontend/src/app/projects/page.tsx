"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Link2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { SiteShell } from "@/layout/site-shell";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import { projects } from "./data";
import type { ProjectItem } from "./types";

const INITIAL_COUNT = 4;

function ProjectIcon() {
  return (
    <div className="relative size-10 shrink-0 overflow-hidden rounded-full border border-(--line) bg-zinc-950">
      <svg className="absolute inset-0 size-full opacity-40" aria-hidden="true">
        <pattern
          id="hatch"
          width="4"
          height="4"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="4" stroke="white" strokeWidth="1" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#hatch)" />
      </svg>
    </div>
  );
}

function ProjectRow({ item }: { item: ProjectItem }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border-b border-(--line)">
        <div className="flex items-center gap-4 px-4 py-4 sm:px-5">
          <ProjectIcon />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium tracking-[-0.03em]">{item.title}</h3>
            <p className="mt-0.5 font-mono text-xs text-(--muted-foreground)">{item.period}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {item.href && (
              <Link
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex size-8 items-center justify-center rounded-md text-(--muted-foreground) transition-colors hover:text-(--foreground)"
              >
                <Link2 className="size-4" />
              </Link>
            )}
            <CollapsibleTrigger className="inline-flex size-8 items-center justify-center rounded-md text-(--muted-foreground) transition-colors hover:text-(--foreground)">
              <ChevronDown
                className={cn("size-4 transition-transform", open && "rotate-180")}
              />
            </CollapsibleTrigger>
          </div>
        </div>

        <CollapsibleContent>
          <div className="border-t border-(--line) px-4 py-5 sm:px-5 sm:pl-[4.5rem]">
            <p className="text-sm leading-relaxed text-(--muted-foreground)">
              {item.description}
            </p>
            {item.highlights.length > 0 && (
              <ul className="mt-4 space-y-2">
                {item.highlights.map((h) => (
                  <li key={h} className="flex gap-2 text-sm leading-relaxed">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-(--foreground)" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            )}
            {item.tags.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-(--line) px-3 py-0.5 font-mono text-xs text-(--muted-foreground)"
                  >
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

export default function ProjectsPage() {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? projects : projects.slice(0, INITIAL_COUNT);

  return (
    <SiteShell>
      <div className="page-frame border-x border-(--line)">
        <section className="screen-line-top screen-line-bottom">
          <header className="screen-line-bottom px-4 py-6 sm:px-5">
            <h1 className="text-3xl font-semibold tracking-tight">
              Projects
              <sup className="-top-[0.75em] ml-1 text-sm font-medium tracking-normal text-(--muted-foreground)">
                ({projects.length})
              </sup>
            </h1>
          </header>

          <div>
            {visible.map((item) => (
              <ProjectRow key={item.title} item={item} />
            ))}
          </div>

          {projects.length > INITIAL_COUNT && (
            <div className="flex justify-center py-5">
              <button
                type="button"
                onClick={() => setShowAll(!showAll)}
                className="inline-flex items-center gap-2 rounded-full border border-(--line) bg-(--background) px-5 py-2 text-sm font-medium transition-colors hover:bg-(--muted)"
              >
                {showAll ? "Show Less" : "Show More"}
                <ChevronDown
                  className={cn("size-4 transition-transform", showAll && "rotate-180")}
                />
              </button>
            </div>
          )}
        </section>
      </div>
    </SiteShell>
  );
}
