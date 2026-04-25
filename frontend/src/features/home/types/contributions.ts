export type ContributionDay = {
  date: string;
  contributionCount: number;
  color: string;
};

export type ContributionWeek = {
  contributionDays: ContributionDay[];
};

export type ContributionGraphData = {
  totalContributions: number;
  weeks: ContributionWeek[];
};
