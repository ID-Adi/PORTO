"use client";

import { useQuery } from "@tanstack/react-query";

import type { ContributionGraphData } from "@/features/home/types/contributions";

const placeholderData: ContributionGraphData = {
  totalContributions: 0,
  weeks: [],
};

export function useGithubContributions() {
  return useQuery({
    queryKey: ["github-contributions"],
    queryFn: async (): Promise<ContributionGraphData> => {
      const response = await fetch("/api/github-contributions");

      if (!response.ok) {
        throw new Error("Failed to fetch GitHub contributions.");
      }

      return (await response.json()) as ContributionGraphData;
    },
    staleTime: 1000 * 60 * 60,
    placeholderData,
  });
}
