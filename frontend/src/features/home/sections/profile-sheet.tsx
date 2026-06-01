"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  Bookmark,
  Clock,
  Code,
  Lightbulb,
  Link2,
  Mail,
  MapPin,
  Phone,
  User,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator as UiSeparator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Panel,
  PanelContent,
  PanelDescription,
  PanelHeader,
  PanelTitle,
  PanelTitleSup,
} from "@/layout/panel";
import { Icons } from "@/layout/icons";
import type { ProfilePageContent, ReadingItem, TimelineItem } from "@/types/content";
import { trpc } from "@/lib/trpc";
import { CopyButton } from "@/components/common/copy-button";
import { usePublicHome } from "@/features/public-data/client";

import { ContributionGraph } from "../components/contribution-graph";
import { LiveClock } from "../components/live-clock";
import {
  OverviewItem,
  OverviewItemContent,
  OverviewItemIcon,
  OverviewItemLink,
} from "../components/overview-item";
import { ProfileIntro } from "../components/profile-intro";

import { BlogShowcaseSection } from "./blog-showcase-section";
import { ProjectsSection as DbProjectsSection } from "./projects-section";
import { SkillsSection as DbSkillsSection } from "./skills-section";
import { ExperienceSection as DbExperienceSection } from "./experience-section";
import { OverviewDbSection } from "./overview-section";
import { SocialRailDbSection } from "./social-rail-section";

type ProfileSheetProps = {
  content: ProfilePageContent;
};

const overviewIconMap: Record<string, React.ElementType> = {
  code: Code,
  lightbulb: Lightbulb,
  mapPin: MapPin,
  clock: Clock,
  phone: Phone,
  mail: Mail,
  link: Link2,
  user: User,
};

// Icons8 modern colored social icons. Style "color" preserves brand color
// recognition; 96px source scales down crisply to the 32px tile.
const icons8 = (slug: string) => `https://img.icons8.com/color/96/${slug}.png`;

export const socialBrands: Record<
  string,
  { src: string }
> = {
  X: { src: icons8("twitterx--v2") },
  GitHub: { src: icons8("github--v1") },
  LinkedIn: { src: icons8("linkedin") },
  "daily.dev": { src: "/social-links/dailydev.svg" },
  Discord: { src: icons8("discord-logo") },
  YouTube: { src: icons8("youtube-play") },
};

function ProfileCover({ monogram }: { monogram: string }) {
  return (
    <section
      className={cn(
        "aspect-[2/1] border-x border-(--line) select-none sm:aspect-[3/1]",
        "flex items-center justify-center text-black dark:text-white",
        "screen-line-bottom after:-bottom-px",
        "bg-[radial-gradient(var(--texture-fg)_1px,transparent_0)] bg-size-[10px_10px] bg-center"
      )}
    >
      <div className="inline-flex h-14 w-28 items-center justify-center pl-[0.12em] font-mono text-[3rem] leading-none font-black tracking-[0.12em] sm:h-16 sm:w-32 sm:text-[3.35rem]">
        {monogram}
      </div>
    </section>
  );
}

function SectionSeparator() {
  return <div className="profile-divider" aria-hidden />;
}

function MiniSeparator() {
  return <div className="profile-mini-divider" aria-hidden />;
}

function SectionAction({
  actionLabel,
  actionHref,
}: {
  actionLabel?: string;
  actionHref?: string;
}) {
  if (!actionLabel) {
    return null;
  }

  if (actionHref) {
    return (
      <Button asChild className="profile-pill border-none" variant="ghost" size="sm">
        <Link href={actionHref}>{actionLabel}</Link>
      </Button>
    );
  }

  return (
    <Button className="profile-pill border-none" variant="ghost" size="sm" type="button">
      {actionLabel}
    </Button>
  );
}

export function RailSection({
  id,
  title,
  children,
  className,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Panel id={id} className={className}>
      <h2 className="sr-only">{title}</h2>
      {children}
    </Panel>
  );
}

export function FrameSection({
  id,
  title,
  count,
  children,
  actionLabel,
  actionHref,
  description,
}: {
  id?: string;
  title: string;
  count?: number;
  children: React.ReactNode;
  actionLabel?: string;
  actionHref?: string;
  description?: string;
}) {
  return (
    <Panel id={id}>
      <PanelHeader className={description ? undefined : "after:content-none"}>
        <div className="flex items-center justify-between gap-4 py-4 sm:py-5">
          <PanelTitle>
            {title}
            {typeof count === "number" ? <PanelTitleSup>({count})</PanelTitleSup> : null}
          </PanelTitle>
          <SectionAction actionLabel={actionLabel} actionHref={actionHref} />
        </div>
        {description ? <PanelDescription>{description}</PanelDescription> : null}
      </PanelHeader>
      {children}
    </Panel>
  );
}

export function OverviewCell({
  icon,
  value,
  kind,
  copyable,
  note,
}: {
  icon: string;
  value: string;
  kind?: "text" | "time";
  copyable?: boolean;
  note?: string;
}) {
  const Icon = overviewIconMap[icon];
  const href = getOverviewHref(icon, value);
  const copyLabel = icon === "phone" ? "phone number" : icon === "mail" ? "email address" : value;

  let contentNode: React.ReactNode;

  if (kind === "time") {
    contentNode = <LiveClock timeZone={value} label={note ?? ""} />;
  } else if (href) {
    contentNode = (
      <OverviewItemLink
        className="text-[13px] tracking-tight"
        href={href}
        target={icon === "mapPin" || icon === "link" ? "_blank" : undefined}
        rel={icon === "mapPin" || icon === "link" ? "noopener noreferrer" : undefined}
      >
        {formatOverviewValue(icon, value)}
      </OverviewItemLink>
    );
  } else {
    contentNode = (
      <OverviewItemContent className="text-[13px] tracking-tight text-(--foreground)">
        {formatOverviewValue(icon, value)}
      </OverviewItemContent>
    );
  }

  return (
    <OverviewItem>
      <OverviewItemIcon>
        {Icon ? <Icon strokeWidth={1.5} /> : null}
      </OverviewItemIcon>

      <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
        <div className="min-w-0">{contentNode}</div>
        {copyable ? <CopyButton value={value} label={copyLabel} /> : null}
      </div>
    </OverviewItem>
  );
}

export function OverviewLeadRow({
  icon,
  value,
}: {
  icon: string;
  value: string;
}) {
  const Icon = overviewIconMap[icon];

  return (
    <OverviewItem>
      <OverviewItemIcon>
        {Icon ? <Icon strokeWidth={1.5} /> : null}
      </OverviewItemIcon>
      <OverviewItemContent className="text-[13px] font-medium tracking-tight text-(--foreground)">
        {value}
      </OverviewItemContent>
    </OverviewItem>
  );
}

const CREATIVE_TOOLS = [
  "Premiere Pro", "After Effects", "CapCut", "Illustrator", "Photoshop",
  "TikTok Ads", "Google Ads", "Meta Ads",
];

const ENGINEERING_TOOLS = [
  "Next.js", "Node.js", "Prisma", "Flutter", "ERP Systems",
];

function AboutDomainTag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-sm border border-(--line) bg-muted px-1.5 py-0.5 font-mono text-[11px] text-(--muted-foreground)">
      {label}
    </span>
  );
}

function AboutDomainLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-widest text-(--muted-foreground)/50">
      {children}
    </p>
  );
}

function AboutSection({ content }: { content: ProfilePageContent }) {
  const [lead, creativeText, engineeringText, closing] = content.about;

  return (
    <FrameSection id="about" title="About">
      <PanelContent className="space-y-5">
        <p className="text-[13.5px] leading-7 font-medium tracking-[-0.01em] text-(--foreground)">
          {lead}
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3 rounded-sm border border-(--line) bg-muted/30 p-4">
            <AboutDomainLabel>Creative</AboutDomainLabel>
            <p className="font-mono text-[12px] leading-6 text-(--muted-foreground)">
              {creativeText}
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {CREATIVE_TOOLS.map((tool) => (
                <AboutDomainTag key={tool} label={tool} />
              ))}
            </div>
          </div>

          <div className="space-y-3 rounded-sm border border-(--line) bg-muted/30 p-4">
            <AboutDomainLabel>Engineering</AboutDomainLabel>
            <p className="font-mono text-[12px] leading-6 text-(--muted-foreground)">
              {engineeringText}
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {ENGINEERING_TOOLS.map((tool) => (
                <AboutDomainTag key={tool} label={tool} />
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-dashed border-(--line) pt-4">
          <div className="h-1 w-1 shrink-0 rounded-full bg-(--muted-foreground)/40" />
          <p className="font-mono text-[12px] leading-6 text-(--muted-foreground) italic">
            {closing}
          </p>
        </div>
      </PanelContent>
    </FrameSection>
  );
}

function GitHubContributionsSection({ content }: { content: ProfilePageContent }) {
  return (
    <Panel id="contributions">
      <h2 className="sr-only">GitHub Contributions</h2>
      <ContributionGraph fallbackData={content.contributions} />
    </Panel>
  );
}

function StackSection({ content }: { content: ProfilePageContent }) {
  return (
    <FrameSection id="stack" title="Tech Stack">
      <PanelContent className="flex flex-wrap gap-2">
        {content.stack.map((item) => (
          <Tooltip key={item.name}>
            <TooltipTrigger className="profile-chip">
              <Image
                className="tech-icon size-4 object-contain"
                src={`https://cdn.simpleicons.org/${item.slug}`}
                alt={item.name}
                unoptimized
                width={16}
                height={16}
              />
              <span>{item.name}</span>
              {item.version ? (
                <span className="text-(--muted-foreground)">{item.version}</span>
              ) : null}
            </TooltipTrigger>
            <TooltipContent sideOffset={8}>
              {item.name}
              {item.version ? ` ${item.version}` : ""}
            </TooltipContent>
          </Tooltip>
        ))}
      </PanelContent>
    </FrameSection>
  );
}

function timelineToReading(item: TimelineItem): ReadingItem {
  let domain = item.author ?? "PORTO";
  if (item.href?.startsWith("http")) {
    try {
      domain = new URL(item.href).hostname.replace(/^www\./, "");
    } catch {
      // keep author fallback
    }
  }
  return {
    title: item.title,
    excerpt: item.detail,
    link: item.href ?? "#reading",
    domain,
    createdAt: item.bookmarkedAt ?? item.period,
    tags: [],
  };
}

function BookmarksSection({
  items,
  bookmarks,
  isLoading = false,
}: {
  items: TimelineItem[];
  bookmarks?: ReadingItem[];
  isLoading?: boolean;
}) {
  const fallback = items.map(timelineToReading);
  const { data } = trpc.bookmarks.list.useQuery(undefined, {
    enabled: bookmarks === undefined,
    placeholderData: fallback,
    staleTime: 5 * 60 * 1000,
  });
  const remoteReading = bookmarks ?? data;
  const reading = remoteReading && remoteReading.length > 0 ? remoteReading : fallback;

  return (
    <FrameSection
      id="reading"
      title="Currently Reading"
      count={isLoading ? undefined : reading.length}
      actionLabel="Read More"
    >
      <div>
        {reading.map((item, index) => (
          <div
            key={`reading-${item.link}-${index}`}
            className={index < reading.length - 1 ? "border-b border-(--line)" : ""}
          >
            <BookmarkItem item={item} />
          </div>
        ))}
      </div>
    </FrameSection>
  );
}

function BookmarkItem({ item }: { item: ReadingItem }) {
  const dateLabel = formatBookmarkDate(item.createdAt);
  const href = item.link;
  const isExternal = href.startsWith("http");

  return (
    <a
      className={cn(
        "flex items-center pr-2 transition-[background-color,color] hover:bg-muted/50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring) focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      )}
      href={href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
    >
      <div
        className={cn(
          "mx-4 flex size-6 shrink-0 items-center justify-center rounded-lg select-none",
          "border border-(--muted-foreground)/15 bg-muted text-(--muted-foreground)",
          "ring-1 ring-(--line) ring-offset-1 ring-offset-background [&_svg]:size-4"
        )}
      >
        <Bookmark strokeWidth={1.7} />
      </div>

      <div className="min-w-0 flex-1 space-y-1 border-l border-dashed border-(--line) p-4 pr-2">
        <h3 className="text-sm leading-snug font-medium tracking-[-0.03em] text-balance">
          {item.title}
        </h3>

        {item.excerpt ? (
          <p className="line-clamp-2 text-[12px] leading-5 text-(--muted-foreground)">
            {item.excerpt}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-(--muted-foreground)">
          <span>{item.domain || "PORTO"}</span>
          <UiSeparator
            className="h-3 bg-(--line)"
            orientation="vertical"
          />
          <time dateTime={item.createdAt}>{dateLabel}</time>
        </div>
      </div>

      <ArrowUpRight className="size-4 shrink-0 text-(--muted-foreground)" />
    </a>
  );
}

function formatBookmarkDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
    .format(date)
    .replaceAll("/", ".");
}

function getOverviewHref(icon: string, value: string) {
  switch (icon) {
    case "mapPin":
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`;
    case "phone":
      return `tel:${value.replace(/\s+/g, "")}`;
    case "mail":
      return `mailto:${value}`;
    case "link":
      return value.startsWith("http") ? value : `https://${value}`;
    default:
      return undefined;
  }
}

function formatOverviewValue(icon: string, value: string) {
  if (icon === "link") {
    return value.replace(/^https?:\/\//, "");
  }

  return value;
}

export function ProfileSheet({ content }: ProfileSheetProps) {
  const homeQuery = usePublicHome();
  const homeData = homeQuery.data;
  const settings = homeData?.settings ?? null;
  const avatarUrl = settings?.avatarUrl ?? null;

  return (
    <div className="*:[[id]]:scroll-mt-24">
      <ProfileCover monogram={content.monogram} />
      <ProfileIntro
        avatarUrl={avatarUrl}
        flipSentences={content.flipSentences}
        name={content.name}
        pronunciationText={content.pronunciationText}
        settings={settings}
        title={content.title}
      />

      <SectionSeparator />
      <OverviewDbSection rows={homeData?.overview ?? []} />
      <MiniSeparator />
      <SocialRailDbSection socials={homeData?.socials ?? []} />
      <SectionSeparator />

      <AboutSection content={content} />
      <MiniSeparator />
      <GitHubContributionsSection content={content} />
      <SectionSeparator />
      <StackSection content={content} />
      <SectionSeparator />
      <DbSkillsSection
        isLoading={homeQuery.isLoading}
        skills={homeData?.skills ?? []}
      />
      <SectionSeparator />
      <BlogShowcaseSection
        isLoading={homeQuery.isLoading}
        posts={homeData?.blog ?? []}
      />
      <SectionSeparator />
      <DbExperienceSection
        companies={homeData?.experience ?? []}
        isLoading={homeQuery.isLoading}
      />
      <SectionSeparator />
      <DbProjectsSection
        isLoading={homeQuery.isLoading}
        projects={homeData?.projects ?? []}
      />
      <SectionSeparator />
      <BookmarksSection
        bookmarks={homeData?.bookmarks ?? []}
        isLoading={homeQuery.isLoading}
        items={content.bookmarks}
      />
      <SectionSeparator />
    </div>
  );
}
