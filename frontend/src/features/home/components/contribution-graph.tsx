"use client";

import { useMemo } from "react";

import type { ContributionGraphData } from "@/features/home/types/contributions";
import { useGithubContributions } from "@/hooks/use-github-contributions";
import { siteConfig } from "@/config/site";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ContributionGraphProps = {
  fallbackData: ContributionGraphData;
};

function formatContributionDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
    .format(new Date(date))
    .replaceAll("/", ".");
}

function getContributionLevel(count: number, maxCount: number) {
  if (count <= 0) {
    return 0;
  }

  if (maxCount <= 4) {
    return Math.min(count, 4) as 0 | 1 | 2 | 3 | 4;
  }

  const ratio = count / maxCount;

  if (ratio <= 0.25) {
    return 1;
  }

  if (ratio <= 0.5) {
    return 2;
  }

  if (ratio <= 0.75) {
    return 3;
  }

  return 4;
}

function LoadingGrid() {
  return (
    <div className="mx-auto flex w-max max-w-full flex-col gap-2 py-2">
      <div className="max-w-full overflow-x-auto overflow-y-hidden px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="contribution-grid min-w-max">
          {Array.from({ length: 30 * 7 }, (_, index) => (
            <div
              key={`loading-${index}`}
              className="contribution-cell"
              data-loading="true"
              aria-hidden
            />
          ))}
        </div>
      </div>
      <div className="px-2 text-[12px] text-(--muted-foreground)">
        Loading contribution data...
      </div>
    </div>
  );
}

export function ContributionGraph({ fallbackData }: ContributionGraphProps) {
  const { data, isError, isFetching, isLoading } = useGithubContributions();

  const apiWeeks = Array.isArray(data?.weeks) ? data.weeks : [];
  const shouldShowFallback = apiWeeks.length === 0;
  const resolvedData = shouldShowFallback ? fallbackData : data;
  const weeks = Array.isArray(resolvedData?.weeks)
    ? resolvedData.weeks
    : [];
  const maxCount = Math.max(
    ...weeks.flatMap((week) =>
      week.contributionDays.map((day) => day.contributionCount)
    ),
    0
  );
  const totalContributions = resolvedData?.totalContributions ?? 0;
  const contributionYear =
    weeks[0]?.contributionDays[0]?.date
      ? new Date(weeks[0].contributionDays[0].date).getFullYear()
      : new Date().getFullYear();
  const showLoadingState =
    isLoading ||
    (isFetching &&
      apiWeeks.length === 0 &&
      (data?.totalContributions ?? 0) === 0);

  const legend = useMemo(() => [0, 1, 2, 3, 4], []);

  if (showLoadingState) {
    return <LoadingGrid />;
  }

  if (isError || !data) {
    return (
      <div className="px-4 py-5 text-sm text-(--muted-foreground)">
        Contribution data unavailable
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-max max-w-full flex-col gap-2 py-2">
      <div className="max-w-full overflow-x-auto overflow-y-hidden px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="contribution-grid min-w-max">
          {weeks.map((week, weekIndex) =>
            week.contributionDays.map((item) => (
              <Tooltip key={`${weekIndex}-${item.date}`}>
                <TooltipTrigger asChild>
                  <div
                    className="contribution-cell"
                    data-level={getContributionLevel(
                      item.contributionCount,
                      maxCount
                    )}
                    aria-label={`${item.contributionCount} contribution${item.contributionCount === 1 ? "" : "s"} on ${formatContributionDate(item.date)}`}
                  />
                </TooltipTrigger>
                <TooltipContent className="font-sans" sideOffset={8}>
                  {item.contributionCount} contribution
                  {item.contributionCount === 1 ? "" : "s"} on{" "}
                  {formatContributionDate(item.date)}
                </TooltipContent>
              </Tooltip>
            ))
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-1 px-2 text-[12px] whitespace-nowrap text-(--muted-foreground) sm:gap-x-4">
        <p>
          {totalContributions.toLocaleString("en")} contributions in{" "}
          {contributionYear} on{" "}
          <a
            className="text-(--foreground) underline decoration-(--line) decoration-1 underline-offset-4 transition-colors hover:decoration-(--foreground)"
            href={`https://github.com/${siteConfig.githubUsername}`}
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          .
        </p>
        <div className="ml-auto flex items-center gap-1">
          <span>Less</span>
          {legend.map((level) => (
            <div
              key={level}
              className="contribution-cell size-[11px]"
              data-level={level}
            />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
