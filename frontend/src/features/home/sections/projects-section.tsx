"use client";

import { useState } from "react";
import { ChevronDown, Link2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import { FrameSection } from "./profile-sheet";

const INITIAL_COUNT = 4;

type Project = {
  id: number;
  title: string;
  description: string | null;
  period: string | null;
  url: string | null;
  repoUrl: string | null;
  highlights: string[];
  tags: string[];
};

function ProjectIcon() {
  return (
    <div className="relative size-10 shrink-0 overflow-hidden rounded-full border border-(--line) bg-zinc-950">
      <svg className="absolute inset-0 size-full opacity-40" aria-hidden="true">
        <pattern
          id="home-project-hatch"
          width="4"
          height="4"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="4" stroke="white" strokeWidth="1" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#home-project-hatch)" />
      </svg>
    </div>
  );
}

function ProjectRow({ item }: { item: Project }) {
  const [open, setOpen] = useState(false);
  const href = item.url ?? item.repoUrl ?? undefined;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border-b border-(--line)">
        <div className="flex items-center gap-4 px-4 py-4 sm:px-5">
          <ProjectIcon />
          <div className="h-10 border-l border-dotted border-(--line)" />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium tracking-[-0.03em]">{item.title}</h3>
            {item.period ? (
              <p className="mt-0.5 font-mono text-xs text-(--muted-foreground)">{item.period}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {href && (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex size-8 items-center justify-center rounded-md text-(--muted-foreground) transition-colors hover:text-(--foreground)"
              >
                <Link2 className="size-4" />
              </a>
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
            {item.description ? (
              <p className="text-sm leading-relaxed text-(--muted-foreground)">{item.description}</p>
            ) : null}
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

export function ProjectsSection() {
  const { data, isLoading } = trpc.projects.list.useQuery();
  const projects = data ?? [];
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? projects : projects.slice(0, INITIAL_COUNT);

  return (
    <FrameSection
      id="projects"
      title="Projects"
      count={projects.length}
      actionLabel="See All"
      actionHref="/projects"
    >
      {isLoading ? (
        <div className="px-4 py-8 text-center text-sm text-(--muted-foreground) sm:px-5">
          Memuat…
        </div>
      ) : projects.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-(--muted-foreground) sm:px-5">
          Belum ada project.
        </div>
      ) : (
        <>
          <div>
            {visible.map((item) => (
              <ProjectRow key={item.id} item={item} />
            ))}
          </div>
          {projects.length > INITIAL_COUNT && (
            <div className="flex justify-center border-t border-(--line) py-4">
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
        </>
      )}
    </FrameSection>
  );
}
