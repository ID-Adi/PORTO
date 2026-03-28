import type { HeroContent } from "@/shared/types/content";

type HeroSectionProps = {
  content: HeroContent;
};

export function HeroSection({ content }: HeroSectionProps) {
  return (
    <section className="section-frame border-b border-(--line)">
      <div className="grid gap-0 md:grid-cols-[1.35fr_0.85fr]">
        <div className="surface-hatch panel relative min-h-[26rem] border-b border-(--line) px-5 py-16 md:border-b-0 md:border-r md:px-8 lg:px-10">
          <div className="relative z-10 flex h-full flex-col justify-between gap-10">
            <div className="space-y-6">
              <p className="eyebrow text-xs text-(--muted-foreground)">
                {content.badge}
              </p>
              <h1 className="max-w-3xl text-4xl font-medium tracking-[-0.06em] text-balance md:text-6xl">
                {content.title}
              </h1>
              <p className="max-w-2xl text-base leading-7 text-(--muted-foreground) md:text-lg">
                {content.description}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-(--muted-foreground)">
              {content.highlights.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-(--border) bg-(--panel-strong) px-3 py-1.5"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        <aside className="surface-dots flex flex-col justify-between gap-8 px-5 py-8 md:px-8 lg:px-10">
          <div className="space-y-3">
            <p className="eyebrow text-xs text-(--muted-foreground)">Setup</p>
            <p className="text-sm leading-6 text-(--muted-foreground)">
              {content.location}
            </p>
          </div>
          <div className="space-y-5">
            <div className="border-t border-(--line) pt-5">
              <p className="text-sm text-(--muted-foreground)">
                Reference direction
              </p>
              <p className="mt-2 text-lg font-medium tracking-[-0.03em]">
                Swiss-grid inspired, Vercel-adjacent, documentation-grade UI.
              </p>
            </div>
            <div className="border-t border-(--line) pt-5">
              <p className="text-sm text-(--muted-foreground)">Current phase</p>
              <p className="mt-2 text-lg font-medium tracking-[-0.03em]">
                Foundation, hierarchy, and component rhythm before feature work.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

