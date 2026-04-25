import { SiteShell } from "@/layout/site-shell";

type PagePlaceholderProps = {
  kicker: string;
  title: string;
  description: string;
};

export function PagePlaceholder({
  kicker,
  title,
  description,
}: PagePlaceholderProps) {
  return (
    <SiteShell>
      <div className="page-frame border-x border-line">
        <section className="screen-line-top screen-line-bottom relative flex min-h-[60vh] flex-col items-center justify-center px-6 py-24 text-center">
          <span className="profile-kicker mb-4">{kicker}</span>
          <h1 className="font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-xl text-sm text-muted-foreground text-balance sm:text-base">
            {description}
          </p>
          <div className="mt-10 flex items-center gap-2 font-mono text-[11px] tracking-[0.24em] text-muted-foreground uppercase">
            <span className="size-1.5 animate-pulse rounded-full bg-foreground" />
            Coming soon
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
