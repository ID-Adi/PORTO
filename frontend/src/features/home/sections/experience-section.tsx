"use client";

import { trpc } from "@/lib/trpc";
import { WorkExperience, type ExperienceItemType } from "@/components/common/work-experience";
import { ExperienceListSkeleton } from "@/components/skeletons/experience-list-skeleton";
import type { PublicExperienceCompany } from "@/features/public-data/types";

import { FrameSection } from "./profile-sheet";

type Position = {
  id: number;
  title: string;
  employmentType: string | null;
  period: string | null;
  description: string | null;
  achievements: string[];
  technologies: string[];
};

type Company = PublicExperienceCompany;

function transform(companies: Company[]): ExperienceItemType[] {
  return companies.map((c) => ({
    id: String(c.id),
    companyName: c.name,
    companyWebsite: c.website ?? undefined,
    isCurrentEmployer: c.isCurrent,
    positions: c.positions.map((p) => ({
      id: String(p.id),
      title: p.title,
      employmentPeriod: parsePeriod(p.period),
      employmentType: p.employmentType ?? "",
      description: p.description ?? "",
      skills: p.technologies,
    })),
  }));
}

function parsePeriod(period: string | null): { start: string; end?: string } {
  if (!period) return { start: "" };
  const parts = period.split(/[–-]/).map((s) => s.trim());
  if (parts.length === 0) return { start: "" };
  if (parts.length === 1) return { start: parts[0] };
  const [start, end] = parts;
  return { start, end: end?.toLowerCase().includes("present") ? undefined : end };
}

export function ExperienceSection({
  companies: injectedCompanies,
  isLoading: injectedLoading = false,
}: {
  companies?: Company[];
  isLoading?: boolean;
}) {
  const query = trpc.experiences.list.useQuery(undefined, {
    enabled: injectedCompanies === undefined,
  });
  const isLoading = injectedCompanies === undefined ? query.isLoading : injectedLoading;
  const companies = (injectedCompanies ?? query.data ?? []) as Company[];
  const items = transform(companies);

  return (
    <FrameSection id="experience" title="Experience" actionHref="/experience" actionLabel="See All">
      {isLoading ? (
        <ExperienceListSkeleton count={2} />
      ) : items.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-(--muted-foreground) sm:px-5">
          Belum ada pengalaman.
        </div>
      ) : (
        <WorkExperience experiences={items} />
      )}
    </FrameSection>
  );
}
