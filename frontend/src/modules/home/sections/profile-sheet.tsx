import Image from "next/image";
import { ArrowUpRight, BadgeCheck, Clock, Code, Dot, Globe, Lightbulb, Link2, Mail, MapPin, Phone, Sparkles, User } from "lucide-react";
import { Icons } from "@/shared/ui/icons";
import ElectricBorder from "@/components/anim/electric-border";

import type { ProfilePageContent } from "@/shared/types/content";

type ProfileSheetProps = {
  content: ProfilePageContent;
};

type SectionProps = {
  id?: string;
  title: string;
  children: React.ReactNode;
  actionLabel?: string;
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

function FrameSection({ id, title, children, actionLabel }: SectionProps) {
  return (
    <section id={id} className="profile-section">
      <div className="profile-section-heading profile-bleed-bottom">
        <h2 className="text-[15px] font-medium tracking-[-0.03em]">{title}</h2>
        {actionLabel ? (
          <button className="profile-pill" type="button">
            {actionLabel}
          </button>
        ) : null}
      </div>
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
            className={`profile-row ${index > 0 ? "border-t border-(--line) profile-bleed-top" : ""}`}
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

const OverviewIconMap: Record<string, React.ElementType> = {
  code: Code,
  lightbulb: Lightbulb,
  mapPin: MapPin,
  clock: Clock,
  phone: Phone,
  mail: Mail,
  link: Link2,
  user: User,
};

function OverviewCell({ icon, value }: { icon: string; value: string }) {
  const Icon = OverviewIconMap[icon];
  return (
    <div className="flex items-center gap-3 px-3 py-2 sm:px-5 lg:px-6">
      <div className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[6px] border border-(--line) bg-black/[0.02] dark:bg-white/[0.03]">
        {Icon && <Icon className="h-3.5 w-3.5 text-(--muted-foreground)" />}
      </div>
      <span className="font-mono text-[13px] tracking-tight text-(--foreground)">{value}</span>
    </div>
  );
}

/* … then inside the profile section … */

const SocialBrands: Record<string, { icon: React.ElementType; bg: string; fg: string }> = {
  X: { icon: Icons.x, bg: "#18181b", fg: "#ffffff" },
  GitHub: { icon: Icons.gitHub, bg: "#24292f", fg: "#ffffff" },
  LinkedIn: { icon: Icons.linkedIn, bg: "#0A66C2", fg: "#ffffff" },
  "daily.dev": { icon: Icons.dailyDev, bg: "#6E5494", fg: "#ffffff" },
  Discord: { icon: Icons.discord, bg: "#5865F2", fg: "#ffffff" },
  YouTube: { icon: Icons.youtube, bg: "#FF0000", fg: "#ffffff" },
};


export function ProfileSheet({ content }: ProfileSheetProps) {
  const socialRows = Array.from(
    { length: Math.ceil(content.socials.length / 3) },
    (_, index) => content.socials.slice(index * 3, index * 3 + 3)
  );

  return (
    <div className="pb-20">
      <section className="profile-hero-mark">
        <div className="flex aspect-[2/1] w-full items-center justify-center sm:aspect-[3/1]">
          <div className="border border-black bg-black px-4 py-2.5 font-mono text-5xl font-black tracking-tight text-white sm:px-5 sm:py-3 sm:text-7xl">
            {content.monogram}
          </div>
        </div>
      </section>

      <section className="profile-section">
        <div className="grid grid-cols-[135px_1fr] sm:grid-cols-[160px_1fr] md:grid-cols-[180px_1fr]">
          <div className="group relative flex items-center justify-center border-r border-(--line) cursor-pointer bg-background aspect-square">
            <div className="relative aspect-square w-full h-full flex items-center justify-center">
              {/* Electric canvas light (hidden by default, shows on group hover) */}
              <div className="absolute inset-0 z-10 w-full h-full pointer-events-none opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100 flex items-center justify-center p-[2px]">
                <ElectricBorder
                  color="#fbbf24" // amber-400
                  speed={1}
                  chaos={0.8}
                  borderRadius={9999}
                  className="w-full h-full block"
                />
              </div>
              
              {/* Inner container to crop image to circle and create border mask */}
              <div className="relative h-[calc(100%-4px)] w-[calc(100%-4px)] overflow-hidden rounded-full border border-(--line) bg-background transition-colors duration-500 group-hover:border-transparent">
                <Image
                  src={content.avatarUrl}
                  alt={content.name}
                  fill
                  sizes="(max-width: 640px) 135px, (max-width: 768px) 160px, 180px"
                  className="object-cover"
                  priority
                />
              </div>
            </div>
          </div>

          <div className="grid grid-rows-[auto_1fr]">
            <div className="flex flex-col justify-center border-b border-(--line) px-3 py-2 sm:px-5 sm:py-4 md:px-6">
              {content.metaLine && (
                <div className="text-[10px] sm:text-[11px] font-mono leading-none text-(--muted-foreground)/60 mb-1 sm:mb-1.5">
                  {content.metaLine}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h1 className="text-xl font-semibold tracking-[-0.05em] sm:text-[28px]">
                  {content.name}
                </h1>
                <BadgeCheck className="h-4 w-4 fill-blue-500 text-white sm:h-5 sm:w-5" />
                <span className="profile-inline-note hidden sm:inline-block ml-1">{content.status}</span>
              </div>
            </div>
            <div className="flex items-start px-3 py-2 sm:px-5 sm:py-4 md:px-6 text-[12px] leading-relaxed text-(--muted-foreground) sm:text-[13px]">
              {content.title}
            </div>
          </div>
        </div>

        <div className="border-t border-(--line) profile-bleed-top py-3 sm:py-4">
          {content.overview.map((row, index) => (
            <div
              key={index}
              className={row.right && index > 0 ? "border-t border-(--line) profile-bleed-top" : ""}
            >
              {row.right ? (
                /* Paired row: 2-col on desktop, stacked on mobile */
                <>
                  <div className="hidden sm:grid sm:grid-cols-2">
                    <OverviewCell icon={row.left.icon} value={row.left.value} />
                    <OverviewCell icon={row.right.icon} value={row.right.value} />
                  </div>
                  <div className="sm:hidden">
                    <OverviewCell icon={row.left.icon} value={row.left.value} />
                    <OverviewCell icon={row.right.icon} value={row.right.value} />
                  </div>
                </>
              ) : (
                /* Single row: full width */
                <OverviewCell icon={row.left.icon} value={row.left.value} />
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="profile-divider" />

      <FrameSection id="socials" title="Social Links">
        <div>
          {socialRows.map((row, rowIndex) => (
            <div
              key={`social-row-${rowIndex}`}
              className={rowIndex > 0 ? "border-t border-(--line) profile-bleed-top" : ""}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-(--line)">
                {row.map((item) => {
                  const brandConfig = SocialBrands[item.label];
                  const BrandIcon = brandConfig?.icon;
                  return (
                    <a
                      key={item.label}
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex items-center gap-3 bg-background px-3 py-3 sm:px-4 sm:py-3.5 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                    >
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: brandConfig?.bg ?? "#18181b" }}
                      >
                        {BrandIcon && <BrandIcon className="h-4.5 w-4.5" style={{ color: brandConfig?.fg ?? "#fff" }} />}
                      </div>
                      <span className="flex-1 text-sm font-medium tracking-[-0.02em]">{item.label}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-(--muted-foreground) transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </FrameSection>

      <div className="profile-mini-divider" />

      <FrameSection id="about" title="About">
        <div className="grid gap-0 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="px-3 py-3 sm:px-4 sm:py-4">
            {content.about.map((paragraph) => (
              <p key={paragraph} className="text-[13px] leading-7 text-(--muted-foreground)">
                {paragraph}
              </p>
            ))}
          </div>
          <div className="grid border-t border-(--line) lg:border-t-0 lg:border-l">
            {content.principles.map((item, index) => (
              <article
                key={item.label}
                className={`px-3 py-3 sm:px-4 ${index > 0 ? "border-t border-(--line)" : ""}`}
              >
                <p className="profile-kicker">{item.label}</p>
                <p className="mt-1 text-sm font-medium tracking-[-0.03em]">{item.value}</p>
                {item.note ? (
                  <p className="mt-1 text-[12px] leading-6 text-(--muted-foreground)">{item.note}</p>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </FrameSection>

      <div className="profile-mini-divider" />

      <FrameSection id="testimonials" title="Testimonials" actionLabel="Wall of Love">
        <div className="grid gap-0 lg:grid-cols-3">
          {content.testimonials.map((item, index) => (
            <article
              key={item.author}
              className={`surface-hatch px-3 py-3 sm:px-4 sm:py-4 ${index > 0 ? "border-t border-(--line) lg:border-l lg:border-t-0" : ""}`}
            >
              <Sparkles className="h-4 w-4 text-(--muted-foreground)" />
              <p className="mt-3 text-[13px] leading-7 text-(--foreground)/88">
                &ldquo;{item.quote}&rdquo;
              </p>
              <div className="mt-4 flex items-center gap-2 text-[12px] text-(--muted-foreground)">
                <span className="font-medium text-(--foreground)">{item.author}</span>
                <Dot className="h-4 w-4" />
                <span>{item.role}</span>
              </div>
            </article>
          ))}
        </div>
      </FrameSection>

      <div className="profile-mini-divider" />

      <FrameSection id="partners" title="Partners" actionLabel="All Partners">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3">
          {content.partners.map((item, index) => (
            <div
              key={item}
              className={`flex min-h-20 items-center px-3 py-3 text-sm font-medium tracking-[-0.03em] sm:px-4 sm:py-4 ${
                index > 0 ? "border-t border-(--line)" : ""
              } ${index % 2 !== 0 ? "sm:border-l" : ""} ${index >= 2 ? "lg:border-t-0" : ""} ${
                index >= 2 ? "lg:border-l" : ""
              }`}
            >
              {item}
            </div>
          ))}
        </div>
      </FrameSection>

      <div className="profile-mini-divider" />

      <FrameSection id="stack" title="Stack">
        <div className="flex flex-wrap gap-2 px-3 py-3 sm:px-4 sm:py-4">
          {content.stack.map((item) => (
            <span key={item} className="profile-chip">
              {item}
            </span>
          ))}
        </div>
      </FrameSection>

      <div className="profile-mini-divider" />

      <FrameSection
        id="components"
        title={`Components (${content.components.length})`}
        actionLabel="All Components"
      >
        <div className="grid gap-0 lg:grid-cols-3">
          {content.components.map((item, index) => (
            <article
              key={item.title}
              className={`px-3 py-3 sm:px-4 sm:py-4 ${index > 0 ? "border-t border-(--line) lg:border-l lg:border-t-0" : ""}`}
            >
              <div className="surface-hatch flex aspect-[1.7/1] items-end border border-(--line) bg-zinc-950 px-2.5 py-2.5 text-white sm:px-3 sm:py-3">
                <div>
                  <p className="profile-kicker text-white/50">{item.meta}</p>
                  <p className="mt-1 text-sm font-medium tracking-[-0.03em]">{item.title}</p>
                </div>
              </div>
              <p className="mt-3 text-[12px] leading-6 text-(--muted-foreground)">{item.description}</p>
            </article>
          ))}
        </div>
      </FrameSection>

      <div className="profile-mini-divider" />

      <FrameSection id="writing" title={`Writing (${content.writing.length})`} actionLabel="All Posts">
        <div className="grid gap-0 lg:grid-cols-2">
          {content.writing.map((item, index) => (
            <article
              key={item.title}
              className={`px-3 py-3 sm:px-4 sm:py-4 ${index > 0 ? "border-t border-(--line) lg:border-l lg:border-t-0" : ""}`}
            >
              <p className="profile-kicker">{item.meta}</p>
              <h3 className="mt-1 text-sm font-medium tracking-[-0.03em]">{item.title}</h3>
              <p className="mt-2 text-[12px] leading-6 text-(--muted-foreground)">{item.description}</p>
              <button className="profile-link mt-3" type="button">
                {item.hrefLabel}
              </button>
            </article>
          ))}
        </div>
      </FrameSection>

      <div className="profile-mini-divider" />

      <ListSection id="experience" title="Experience" items={content.experience} />
      <div className="profile-mini-divider" />
      <ListSection id="projects" title="Projects" items={content.projects} actionLabel="See All" />
      <div className="profile-mini-divider" />
      <ListSection id="awards" title="Honors & Awards" items={content.awards} actionLabel="Full List" />
      <div className="profile-mini-divider" />
      <ListSection
        id="certifications"
        title="Certifications"
        items={content.certifications}
        actionLabel="Verify"
      />
      <div className="profile-mini-divider" />
      <ListSection id="bookmarks" title="Bookmarks" items={content.bookmarks} actionLabel="Read More" />
    </div>
  );
}
