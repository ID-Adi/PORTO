import Image from "next/image";
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
import type { ProfilePageContent, TimelineItem } from "@/types/content";
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

const socialBrands: Record<
  string,
  { src: string }
> = {
  X: { src: "/social-links/x.svg" },
  GitHub: { src: "/social-links/github.svg" },
  LinkedIn: { src: "/social-links/linkedin.svg" },
  "daily.dev": { src: "/social-links/dailydev.svg" },
  Discord: { src: "/social-links/discord.svg" },
  YouTube: { src: "/social-links/youtube.svg" },
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

function AboutSection({ content }: { content: ProfilePageContent }) {
  return (
    <FrameSection id="about" title="About">
      <PanelContent className="space-y-4">
        {content.about.map((paragraph) => (
          <p key={paragraph} className="font-mono text-[13px] leading-7 text-(--muted-foreground)">
            {paragraph}
          </p>
        ))}
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
  items: ProfilePageContent["components"] | ProfilePageContent["blog"];
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
            {id === "components" ? (
              <div className="surface-hatch flex aspect-[1.7/1] items-end border border-(--line) bg-zinc-950 px-3 py-3 text-white">
                <div>
                  <p className="profile-kicker text-white/50">{item.meta}</p>
                  <p className="mt-1 text-sm font-medium tracking-[-0.03em]">{item.title}</p>
                </div>
              </div>
            ) : (
              <p className="profile-kicker">{item.meta}</p>
            )}

            {id !== "components" ? (
              <h3 className="mt-1 text-sm font-medium tracking-[-0.03em]">{item.title}</h3>
            ) : null}
            <p className="mt-3 text-[12px] leading-6 text-(--muted-foreground)">{item.description}</p>
            <button className="profile-link mt-3" type="button">
              {item.hrefLabel}
            </button>
          </article>
        ))}
      </div>
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
        id="components"
        title="Components"
        items={content.components}
        count={content.components.length}
        actionLabel="All Components"
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
      <ListSection id="projects" title="Projects" items={content.projects} actionLabel="See All" />
      <SectionSeparator />
      <BookmarksSection items={content.bookmarks} />
      <SectionSeparator />
    </div>
  );
}
