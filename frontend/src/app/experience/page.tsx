"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { SiteShell } from "@/layout/site-shell";
import { ThumbImage } from "@/components/common/thumb-image";
import { ExperienceListSkeleton } from "@/components/skeletons/experience-list-skeleton";
import { usePublicExperience } from "@/features/public-data/client";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type Position = {
  id: number;
  title: string;
  period: string | null;
  description: string | null;
  achievements: string[];
  technologies: string[];
};

type Company = {
  id: number;
  name: string;
  location: string | null;
  logoUrl: string | null;
  isCurrent: boolean;
  positions: Position[];
};

function PositionBlock({ position, company }: { position: Position; company: Company }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="block border-b border-(--line) last:border-b-0">
      <div>
        <div className="flex items-center gap-4 px-4 py-4 sm:px-5">
          <ThumbImage
            src={company.logoUrl}
            alt={company.name}
            className="size-10 shrink-0 rounded-full border border-(--line)"
          />
          <div className="h-10 border-l border-dotted border-(--line)" />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium tracking-[-0.03em]">{position.title}</h3>
            <p className="mt-0.5 font-mono text-xs text-(--muted-foreground)">
              {company.name}
              {position.period ? ` · ${position.period}` : ""}
              {company.location ? ` · ${company.location}` : ""}
            </p>
          </div>
          <CollapsibleTrigger className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-(--muted-foreground) transition-colors hover:text-(--foreground)">
            <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <div className="border-t border-(--line) px-4 py-5 sm:px-5 sm:pl-[4.5rem]">
            {position.description ? (
              <p className="text-sm leading-relaxed text-(--muted-foreground)">
                {position.description}
              </p>
            ) : null}
            {position.achievements.length > 0 && (
              <ul className="mt-4 space-y-2">
                {position.achievements.map((a) => (
                  <li key={a} className="flex gap-2 text-sm leading-relaxed">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-(--foreground)" />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            )}
            {position.technologies.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {position.technologies.map((tag) => (
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
  const { data, isLoading } = usePublicExperience();
  const companies = (data ?? []) as Company[];
  const totalPositions = companies.reduce((acc, c) => acc + c.positions.length, 0);

  return (
    <SiteShell>
      <div className="page-frame border-x border-(--line)">
        <section>
          <header className="screen-line-bottom px-4 py-6 sm:px-5">
            <h1 className="text-3xl font-semibold tracking-tight">
              Experience
              <sup className="-top-[0.75em] ml-1 text-sm font-medium tracking-normal text-(--muted-foreground)">
                ({totalPositions})
              </sup>
            </h1>
          </header>
          {isLoading ? (
            <ExperienceListSkeleton />
          ) : companies.length === 0 ? (
            <div className="flex items-center justify-center py-24">
              <span className="text-sm text-(--muted-foreground)">Belum ada pengalaman.</span>
            </div>
          ) : (
            <div>
              {companies.flatMap((c) =>
                c.positions.map((p) => (
                  <PositionBlock key={`${c.id}-${p.id}`} position={p} company={c} />
                )),
              )}
            </div>
          )}
        </section>
      </div>
    </SiteShell>
  );
}
