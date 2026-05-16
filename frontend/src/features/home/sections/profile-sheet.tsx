"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  Bookmark,
  ChevronDown,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator as UiSeparator } from "@/components/ui/separator";
import { WorkExperience } from "@/components/common/work-experience";
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
import type { ProfilePageContent, ProjectEntry, TimelineItem } from "@/types/content";
import { CopyButton } from "@/components/common/copy-button";

import { ContributionGraph } from "../components/contribution-graph";
import { LiveClock } from "../components/live-clock";
import {
  OverviewItem,
  OverviewItemContent,
  OverviewItemIcon,
  OverviewItemLink,
} from "../components/overview-item";
import { ProfileIntro } from "../components/profile-intro";
import { SocialLogoTile } from "../components/social-logo-tile";

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

const socialBrands: Record<
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

function SectionAction({ actionLabel }: { actionLabel?: string }) {
  if (!actionLabel) {
    return null;
  }

  return (
    <Button className="profile-pill border-none" variant="ghost" size="sm" type="button">
      {actionLabel}
    </Button>
  );
}

function RailSection({
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

function FrameSection({
  id,
  title,
  count,
  children,
  actionLabel,
  description,
}: {
  id?: string;
  title: string;
  count?: number;
  children: React.ReactNode;
  actionLabel?: string;
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
          <SectionAction actionLabel={actionLabel} />
        </div>
        {description ? <PanelDescription>{description}</PanelDescription> : null}
      </PanelHeader>
      {children}
    </Panel>
  );
}

function OverviewCell({
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
    contentNode = <LiveClock />;
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

function OverviewLeadRow({
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

function OverviewSection({ content }: { content: ProfilePageContent }) {
  const leadRows = content.overview.slice(0, 2).map((row) => row.left);
  const compactRows = content.overview
    .slice(2)
    .flatMap((row) => [row.left, row.right])
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <RailSection id="overview" title="Overview">
      <PanelContent className="space-y-2.5">
        {leadRows.map((item, index) => (
          <OverviewLeadRow key={`${item.icon}-${index}`} {...item} />
        ))}

        <div className="grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
          {compactRows.map((item, index) => (
            <OverviewCell key={`${item.icon}-${index}`} {...item} />
          ))}
        </div>
      </PanelContent>
    </RailSection>
  );
}

function SocialLinkRail({ content }: { content: ProfilePageContent }) {
  return (
    <RailSection
      id="socials"
      title="Social Links"
      className="after:content-none"
    >
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 -z-1 grid grid-cols-2 gap-2 md:grid-cols-3">
          <div className="border-r border-line" />
          <div className="border-l border-line md:border-x" />
          <div className="border-l border-line max-md:hidden" />
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {content.socials.map((item) => (
            <SocialLinkItem key={item.label} item={item} />
          ))}
        </div>
      </div>
    </RailSection>
  );
}

function SocialLinkItem({
  item,
}: {
  item: ProfilePageContent["socials"][number];
}) {
  const brandConfig = socialBrands[item.label];

  return (
    <a
      href={item.href}
      target="_blank"
      rel="noopener"
      className={cn(
        "social-link-grid-item flex cursor-pointer items-center gap-4 p-4 pr-2 transition-[background-color] ease-out hover:bg-accent-muted"
      )}
    >
      <SocialLogoTile
        src={brandConfig?.src ?? "/social-links/github.svg"}
        alt={item.label}
      />

      <h3 className="flex-1 font-medium">{item.label}</h3>

      <ArrowUpRight className="size-4 text-muted-foreground" />
    </a>
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

function CardGridSection({
  id,
  title,
  items,
  actionLabel,
  count,
  columns,
}: {
  id: string;
  title: string;
  items: ProfilePageContent["skills"] | ProfilePageContent["blog"];
  actionLabel?: string;
  count?: number;
  columns: string;
}) {
  return (
    <FrameSection id={id} title={title} count={count} actionLabel={actionLabel}>
      <div className={cn("grid gap-0", columns)}>
        {items.map((item, index) => (
          <article
            key={item.title}
            className={`px-4 py-4 sm:px-5 ${
              index > 0 ? "border-t border-(--line) lg:border-t-0 lg:border-l" : ""
            }`}
          >
            {id === "skills" ? (
              <div className="surface-hatch flex aspect-[1.7/1] items-end border border-(--line) bg-zinc-950 px-3 py-3 text-white">
                <div>
                  <p className="profile-kicker text-white/50">{item.meta}</p>
                  <p className="mt-1 text-sm font-medium tracking-[-0.03em]">{item.title}</p>
                </div>
              </div>
            ) : (
              <p className="profile-kicker">{item.meta}</p>
            )}

            {id !== "skills" ? (
              <h3 className="mt-1 text-sm font-medium tracking-[-0.03em]">{item.title}</h3>
            ) : null}
            <p className="mt-3 text-[12px] leading-6 text-(--muted-foreground)">{item.description}</p>
            {id === "skills" ? (
              <Link href="/skills" className="profile-link mt-3 inline-block">
                {item.hrefLabel}
              </Link>
            ) : (
              <button className="profile-link mt-3" type="button">
                {item.hrefLabel}
              </button>
            )}
          </article>
        ))}
      </div>
    </FrameSection>
  );
}

function ProjectIcon() {
  return (
    <div className="relative size-10 shrink-0 overflow-hidden rounded-full border border-(--line) bg-zinc-950">
      <svg className="absolute inset-0 size-full opacity-40" aria-hidden="true">
        <pattern
          id="project-hatch"
          width="4"
          height="4"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="4" stroke="white" strokeWidth="1" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#project-hatch)" />
      </svg>
    </div>
  );
}

function ProjectRow({ item }: { item: ProjectEntry }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border-b border-(--line)">
        <div className="flex items-center gap-4 px-4 py-4 sm:px-5">
          <ProjectIcon />
          <div className="h-10 border-l border-dotted border-(--line)" />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium tracking-[-0.03em]">{item.title}</h3>
            <p className="mt-0.5 font-mono text-xs text-(--muted-foreground)">{item.period}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {item.href && (
              <a
                href={item.href}
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

function ProjectsSection({ content }: { content: ProfilePageContent }) {
  const INITIAL_COUNT = 4;
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? content.projects : content.projects.slice(0, INITIAL_COUNT);

  return (
    <FrameSection
      id="projects"
      title="Projects"
      count={content.projects.length}
      actionLabel="See All"
    >
      <div>
        {visible.map((item) => (
          <ProjectRow key={item.title} item={item} />
        ))}
      </div>
      {content.projects.length > INITIAL_COUNT && (
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
    </FrameSection>
  );
}

function ListSection({
  id,
  title,
  items,
  actionLabel,
}: {
  id: string;
  title: string;
  items: TimelineItem[];
  actionLabel?: string;
}) {
  return (
    <FrameSection id={id} title={title} actionLabel={actionLabel}>
      <div className="divide-y divide-(--line)">
        {items.map((item, index) => (
          <article
            key={`${title}-${item.title}-${index}`}
            className="profile-row"
          >
            <p className="profile-kicker">{item.period}</p>
            <div>
              <h3 className="text-sm font-medium tracking-[-0.03em]">{item.title}</h3>
              <p className="mt-1 text-[12px] leading-6 text-(--muted-foreground)">{item.detail}</p>
            </div>
          </article>
        ))}
      </div>
    </FrameSection>
  );
}

function ExperienceSection({ content }: { content: ProfilePageContent }) {
  return (
    <FrameSection id="experience" title="Experience">
      <WorkExperience experiences={content.experience} />
    </FrameSection>
  );
}

function BookmarksSection({
  items,
}: {
  items: TimelineItem[];
}) {
  return (
    <FrameSection
      id="bookmarks"
      title="Bookmarks"
      count={items.length}
      actionLabel="Read More"
    >
      <div>
        {items.map((item, index) => (
          <div
            key={`bookmark-${item.title}-${index}`}
            className={index < items.length - 1 ? "border-b border-(--line)" : ""}
          >
            <BookmarkItem item={item} />
          </div>
        ))}
      </div>
    </FrameSection>
  );
}

function BookmarkItem({ item }: { item: TimelineItem }) {
  const dateLabel = formatBookmarkDate(item.bookmarkedAt ?? item.period);
  const href = item.href ?? "#bookmarks";
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

        <p className="text-[12px] leading-5 text-(--muted-foreground)">
          {item.detail}
        </p>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-(--muted-foreground)">
          <span>{item.author ?? "PORTO"}</span>
          <UiSeparator
            className="h-3 bg-(--line)"
            orientation="vertical"
          />
          <time dateTime={item.bookmarkedAt ?? item.period}>{dateLabel}</time>
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
  return (
    <div className="*:[[id]]:scroll-mt-24">
      <ProfileCover monogram={content.monogram} />
      <ProfileIntro
        avatarUrl={content.avatarUrl}
        flipSentences={content.flipSentences}
        name={content.name}
        pronunciationText={content.pronunciationText}
        title={content.title}
      />

      <SectionSeparator />
      <OverviewSection content={content} />
      <MiniSeparator />
      <SocialLinkRail content={content} />
      <SectionSeparator />

      <AboutSection content={content} />
      <MiniSeparator />
      <GitHubContributionsSection content={content} />
      <SectionSeparator />
      <StackSection content={content} />
      <SectionSeparator />
      <CardGridSection
        id="skills"
        title="Skills"
        items={content.skills}
        count={content.skills.length}
        actionLabel="All Skills"
        columns="lg:grid-cols-3"
      />
      <SectionSeparator />
      <CardGridSection
        id="writing"
        title="Blog"
        items={content.blog}
        count={content.blog.length}
        actionLabel="All Posts"
        columns="lg:grid-cols-2"
      />
      <SectionSeparator />
      <ExperienceSection content={content} />
      <SectionSeparator />
      <ProjectsSection content={content} />
      <SectionSeparator />
      <BookmarksSection items={content.bookmarks} />
      <SectionSeparator />
    </div>
  );
}
