import { NextResponse } from "next/server";

import type {
  ContributionGraphData,
  ContributionWeek,
} from "@/modules/home/types/contributions";
import { siteConfig } from "@/shared/config/site";

export const revalidate = 3600;

type GitHubResponse = {
  data?: {
    user?: {
      contributionsCollection?: {
        contributionCalendar?: {
          totalContributions: number;
          weeks: ContributionWeek[];
        };
      };
    };
  };
};

const emptyContributionResponse: ContributionGraphData = {
  totalContributions: 0,
  weeks: [],
};

export async function GET() {
  const token = process.env.GITHUB_TOKEN;
  const username = process.env.GITHUB_USERNAME || siteConfig.githubUsername;

  if (!token || !username) {
    return NextResponse.json(emptyContributionResponse);
  }

  try {
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
          query($login: String!) {
            user(login: $login) {
              contributionsCollection {
                contributionCalendar {
                  totalContributions
                  weeks {
                    contributionDays {
                      date
                      contributionCount
                      color
                    }
                  }
                }
              }
            }
          }
        `,
        variables: {
          login: username,
        },
      }),
      next: { revalidate },
    });

    if (!response.ok) {
      return NextResponse.json(emptyContributionResponse);
    }

    const payload = (await response.json()) as GitHubResponse;
    const calendar = payload.data?.user?.contributionsCollection?.contributionCalendar;

    if (!calendar) {
      return NextResponse.json(emptyContributionResponse);
    }

    return NextResponse.json({
      totalContributions: calendar.totalContributions,
      weeks: Array.isArray(calendar.weeks) ? calendar.weeks : [],
    });
  } catch {
    return NextResponse.json(emptyContributionResponse);
  }
}
