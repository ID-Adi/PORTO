import {
  ArrowUpRight,
  Clock,
  Code,
  Dot,
  Lightbulb,
  Link2,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { Icons } from "@/shared/ui/icons";
import type { ProfilePageContent } from "@/shared/types/content";

import { ProfileIntro } from "../components/profile-intro";

type ProfileSheetProps = {
  content: ProfilePageContent;
};

type SectionProps = {
  id?: string;
  title: string;
  count?: number;
  children: React.ReactNode;
  actionLabel?: string;
};

type RailSectionProps = {
  id?: string;
  title: string;
  children: React.ReactNode;
  className?: string;
};

type ListSectionProps = {
  id?: string;
  title: string;
  items: {
    period: string;
    title: string;
    detail: string;
  }[];
  actionLabel?: string;
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
  { icon: React.ElementType; bg: string; fg: string }
> = {
  X: { icon: Icons.x, bg: "#18181b", fg: "#ffffff" },
  GitHub: { icon: Icons.gitHub, bg: "#24292f", fg: "#ffffff" },
  LinkedIn: { icon: Icons.linkedIn, bg: "#0A66C2", fg: "#ffffff" },
  "daily.dev": { icon: Icons.dailyDev, bg: "#6E5494", fg: "#ffffff" },
  Discord: { icon: Icons.discord, bg: "#5865F2", fg: "#ffffff" },
  YouTube: { icon: Icons.youtube, bg: "#FF0000", fg: "#ffffff" },
};

function SectionAction({ actionLabel }: { actionLabel?: string }) {
  if (!actionLabel) {
    return null;
  }

  return (
    <button className="profile-pill" type="button">
      {actionLabel}
    </button>
  );
}

function RailSection({
  id,
  title,
  children,
  className,
}: RailSectionProps) {
  return (
    <section id={id} className={cn("profile-panel", className)}>
      <h2 className="sr-only">{title}</h2>
      {children}
    </section>
  );
}

function FrameSection({
  id,
  title,
  count,
  children,
  actionLabel,
}: SectionProps) {
  return (
    <section id={id} className="profile-panel">
      <header className="profile-section-heading">
        <h2 className="profile-panel-title">
          {title}
          {typeof count === "number" ? (
            <sup className="profile-panel-sup">({count})</sup>
          ) : null}
        </h2>
        <SectionAction actionLabel={actionLabel} />
      </header>
      {children}
    </section>
  );
}

function ListSection({ id, title, items, actionLabel }: ListSectionProps) {
  return (
    <FrameSection id={id} title={title} actionLabel={actionLabel}>
      <div>
        {items.map((item, index) => (
          <article
            key={`${title}-${item.title}-${index}`}
            className={`profile-row ${index > 0 ? "border-t border-(--line)" : ""}`}
          >
            <p className="profile-kicker">{item.period}</p>
            <div>
              <h3 className="text-sm font-medium tracking-[-0.03em]">
                {item.title}
              </h3>
              <p className="mt-1 text-[12px] leading-6 text-(--muted-foreground)">
                {item.detail}
              </p>
            </div>
          </article>
        ))}
      </div>
    </FrameSection>
  );
}

function ProfileCover({ monogram }: { monogram: string }) {
  return (
    <section className="profile-hero-mark screen-line-bottom">
      <div className="flex aspect-[2.2/1] w-full items-center justify-center sm:aspect-[3/1]">
        <div className="flex select-none items-center justify-center border border-black bg-black px-5 py-3 font-mono text-5xl font-black tracking-[0.18em] text-white sm:px-6 sm:py-4 sm:text-7xl">
          {monogram}
        </div>
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

function OverviewCell({
  icon,
  value,
}: {
  icon: string;
  value: string;
}) {
  const Icon = overviewIconMap[icon];
  const href = getOverviewHref(icon, value);

  return (
    <div className="flex items-center gap-4 font-mono text-sm">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-(--line) bg-background shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        {Icon ? (
          <Icon className="size-3.5 text-(--muted-foreground)" strokeWidth={1.5} />
        ) : null}
      </div>

      {href ? (
        <a
          className="text-balance text-[13px] tracking-tight underline-offset-4 hover:underline"
          href={href}
          target="_blank"
          rel="noopener"
        >
          {formatOverviewValue(icon, value)}
        </a>
      ) : (
        <p className="text-balance text-[13px] tracking-tight text-(--foreground)">
          {formatOverviewValue(icon, value)}
        </p>
      )}
    </div>
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
    <div className="flex items-center gap-4 font-mono text-sm">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-(--line) bg-muted/50 ring-1 ring-(--line) ring-offset-1 ring-offset-background">
        {Icon ? (
          <Icon className="size-3.5 text-(--muted-foreground)" strokeWidth={1.5} />
        ) : null}
      </div>

      <p className="text-[13px] font-medium tracking-tight text-(--foreground)">
        {value}
      </p>
    </div>
  );
}

function OverviewSection({ content }: { content: ProfilePageContent }) {
  const leadRows = content.overview.slice(0, 2).map((row) => row.left);
  const compactRows = content.overview
    .slice(2)
    .flatMap((row) => [row.left, row.right].filter(Boolean)) as Array<{
    icon: string;
    value: string;
  }>;

  return (
    <RailSection id="overview" title="Overview">
      <div className="p-4 sm:p-5">
        <div className="space-y-2.5">
          {leadRows.map((item, index) => (
            <OverviewLeadRow key={`${item.icon}-${index}`} {...item} />
          ))}
        </div>

        <div className="mt-4 grid gap-x-4 gap-y-2.5 border-t border-(--line) pt-4 sm:grid-cols-2">
          {compactRows.map((item, index) => (
            <OverviewCell key={`${item.icon}-${index}`} {...item} />
          ))}
        </div>
      </div>
    </RailSection>
  );
}

function SocialLinkRail({ content }: { content: ProfilePageContent }) {
  return (
    <RailSection id="socials" title="Social Links" className="screen-line-top">
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 -z-1 grid grid-cols-2 gap-2 md:grid-cols-3">
          <div className="border-r border-(--line)" />
          <div className="border-l border-(--line) md:border-x" />
          <div className="hidden border-l border-(--line) md:block" />
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {content.socials.map((item, index) => {
            const brandConfig = socialBrands[item.label];
            const BrandIcon = brandConfig?.icon;

            return (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  "flex items-center gap-4 p-4 pr-2 transition-[background-color] ease-out hover:bg-black/[0.02] dark:hover:bg-white/[0.03]",
                  "max-md:nth-[2n+1]:screen-line-top max-md:nth-[2n+1]:screen-line-bottom",
                  "md:nth-[3n+1]:screen-line-top md:nth-[3n+1]:screen-line-bottom"
                )}
              >
                <div
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-black/10 ring-inset dark:ring-white/15"
                  style={{ backgroundColor: brandConfig?.bg ?? "#18181b" }}
                >
                  {BrandIcon ? (
                    <BrandIcon
                      className="size-4"
                      style={{ color: brandConfig?.fg ?? "#fff" }}
                    />
                  ) : null}
                </div>

                <h3 className="flex-1 text-sm font-medium tracking-[-0.02em]">
                  {item.label}
                </h3>

                <ArrowUpRight className="size-4 text-(--muted-foreground)" />
              </a>
            );
          })}
        </div>
      </div>
    </RailSection>
  );
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
    <div className="pb-20 *:[[id]]:scroll-mt-24">
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
      <SocialLinkRail content={content} />
      <SectionSeparator />
      <FrameSection id="about" title="About">
        <div className="grid gap-0 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="px-4 py-4 sm:px-5">
            {content.about.map((paragraph) => (
              <p
                key={paragraph}
                className="text-[13px] leading-7 text-(--muted-foreground)"
              >
                {paragraph}
              </p>
            ))}
          </div>
          <div className="grid border-t border-(--line) lg:border-t-0 lg:border-l">
            {content.principles.map((item, index) => (
              <article
                key={item.label}
                className={`px-4 py-4 sm:px-5 ${
                  index > 0 ? "border-t border-(--line)" : ""
                }`}
              >
                <p className="profile-kicker">{item.label}</p>
                <p className="mt-1 text-sm font-medium tracking-[-0.03em]">
                  {item.value}
                </p>
                {item.note ? (
                  <p className="mt-1 text-[12px] leading-6 text-(--muted-foreground)">
                    {item.note}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </FrameSection>

      <MiniSeparator />
      <FrameSection
        id="testimonials"
        title="Testimonials"
        actionLabel="Wall of Love"
      >
        <div className="grid gap-0 lg:grid-cols-3">
          {content.testimonials.map((item, index) => (
            <article
              key={item.author}
              className={`surface-hatch px-4 py-4 sm:px-5 ${
                index > 0
                  ? "border-t border-(--line) lg:border-t-0 lg:border-l"
                  : ""
              }`}
            >
              <Sparkles className="size-4 text-(--muted-foreground)" />
              <p className="mt-3 text-[13px] leading-7 text-(--foreground)/88">
                &ldquo;{item.quote}&rdquo;
              </p>
              <div className="mt-4 flex items-center gap-2 text-[12px] text-(--muted-foreground)">
                <span className="font-medium text-(--foreground)">
                  {item.author}
                </span>
                <Dot className="size-4" />
                <span>{item.role}</span>
              </div>
            </article>
          ))}
        </div>
      </FrameSection>

      <MiniSeparator />
      <FrameSection id="partners" title="Partners" actionLabel="All Partners">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3">
          {content.partners.map((item, index) => (
            <div
              key={item}
              className={`flex min-h-20 items-center px-4 py-4 text-sm font-medium tracking-[-0.03em] ${
                index > 0 ? "border-t border-(--line)" : ""
              } ${index % 2 !== 0 ? "sm:border-l" : ""} ${
                index >= 2 ? "lg:border-t-0 lg:border-l" : ""
              }`}
            >
              {item}
            </div>
          ))}
        </div>
      </FrameSection>

      <MiniSeparator />
      <FrameSection id="stack" title="Stack">
        <div className="flex flex-wrap gap-2 px-4 py-4 sm:px-5">
          {content.stack.map((item) => (
            <span key={item} className="profile-chip">
              {item}
            </span>
          ))}
        </div>
      </FrameSection>

      <MiniSeparator />
      <FrameSection
        id="components"
        title="Components"
        count={content.components.length}
        actionLabel="All Components"
      >
        <div className="grid gap-0 lg:grid-cols-3">
          {content.components.map((item, index) => (
            <article
              key={item.title}
              className={`px-4 py-4 sm:px-5 ${
                index > 0
                  ? "border-t border-(--line) lg:border-t-0 lg:border-l"
                  : ""
              }`}
            >
              <div className="surface-hatch flex aspect-[1.7/1] items-end border border-(--line) bg-zinc-950 px-3 py-3 text-white">
                <div>
                  <p className="profile-kicker text-white/50">{item.meta}</p>
                  <p className="mt-1 text-sm font-medium tracking-[-0.03em]">
                    {item.title}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-[12px] leading-6 text-(--muted-foreground)">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </FrameSection>

      <MiniSeparator />
      <FrameSection
        id="writing"
        title="Writing"
        count={content.writing.length}
        actionLabel="All Posts"
      >
        <div className="grid gap-0 lg:grid-cols-2">
          {content.writing.map((item, index) => (
            <article
              key={item.title}
              className={`px-4 py-4 sm:px-5 ${
                index > 0
                  ? "border-t border-(--line) lg:border-t-0 lg:border-l"
                  : ""
              }`}
            >
              <p className="profile-kicker">{item.meta}</p>
              <h3 className="mt-1 text-sm font-medium tracking-[-0.03em]">
                {item.title}
              </h3>
              <p className="mt-2 text-[12px] leading-6 text-(--muted-foreground)">
                {item.description}
              </p>
              <button className="profile-link mt-3" type="button">
                {item.hrefLabel}
              </button>
            </article>
          ))}
        </div>
      </FrameSection>

      <MiniSeparator />
      <ListSection id="experience" title="Experience" items={content.experience} />
      <MiniSeparator />
      <ListSection
        id="projects"
        title="Projects"
        items={content.projects}
        actionLabel="See All"
      />
      <MiniSeparator />
      <ListSection
        id="awards"
        title="Honors & Awards"
        items={content.awards}
        actionLabel="Full List"
      />
      <MiniSeparator />
      <ListSection
        id="certifications"
        title="Certifications"
        items={content.certifications}
        actionLabel="Verify"
      />
      <MiniSeparator />
      <ListSection
        id="bookmarks"
        title="Bookmarks"
        items={content.bookmarks}
        actionLabel="Read More"
      />
    </div>
  );
}
