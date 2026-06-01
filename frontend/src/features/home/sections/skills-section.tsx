"use client";

import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { HomeSkillsGridSkeleton } from "@/components/skeletons/home-skills-grid-skeleton";
import type { PublicSkill } from "@/features/public-data/types";

import { FrameSection } from "./profile-sheet";

type Skill = PublicSkill;

const CATEGORY_LABELS: Record<string, string> = {
  frontend: "Frontend",
  backend: "Backend",
  devops: "DevOps & Cloud",
  tools: "Tools & Workflow",
  architecture: "Architecture & Patterns",
  tooling: "Tooling",
  other: "Other",
};

function ProficiencyDots({ level }: { level: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "size-1.5 rounded-full",
            i < level ? "bg-(--foreground)" : "bg-(--line)",
          )}
        />
      ))}
    </div>
  );
}

export function SkillsSection({
  skills: injectedSkills,
  isLoading: injectedLoading = false,
}: {
  skills?: Skill[];
  isLoading?: boolean;
}) {
  const query = trpc.skills.list.useQuery(undefined, {
    enabled: injectedSkills === undefined,
  });
  const isLoading = injectedSkills === undefined ? query.isLoading : injectedLoading;
  const skills = (injectedSkills ?? query.data ?? []) as Skill[];
  const topSkills = skills.slice(0, 6);

  return (
    <FrameSection
      id="skills"
      title="Skills"
      count={skills.length}
      actionLabel="All Skills"
      actionHref="/skills"
    >
      {isLoading ? (
        <HomeSkillsGridSkeleton />
      ) : skills.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-(--muted-foreground) sm:px-5">
          Belum ada skill.
        </div>
      ) : (
        <div className="grid gap-0 lg:grid-cols-3">
          {topSkills.map((skill, index) => (
            <article
              key={skill.id}
              className={cn(
                "px-4 py-4 sm:px-5",
                index > 0 && "border-t border-(--line) lg:border-t-0 lg:border-l",
                index >= 3 && "lg:border-t",
              )}
            >
              <p className="profile-kicker">{CATEGORY_LABELS[skill.category] ?? skill.category}</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <h3 className="text-sm font-medium tracking-[-0.03em]">{skill.name}</h3>
                <ProficiencyDots level={skill.level} />
              </div>
              {skill.description ? (
                <p className="mt-3 text-[12px] leading-6 text-(--muted-foreground)">
                  {skill.description}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </FrameSection>
  );
}
