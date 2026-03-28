import { siteConfig } from "@/shared/config/site";

type SiteShellProps = {
  children: React.ReactNode;
};

export function SiteShell({ children }: SiteShellProps) {
  return (
    <main className="mx-auto max-w-[1180px] px-3 py-3 md:px-5 md:py-5">
      <div className="border border-(--line) bg-(--panel-strong)">
        <header className="section-frame border-b border-(--line) px-5 py-4 md:px-8 lg:px-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow text-xs text-(--muted-foreground)">
                {siteConfig.name}
              </p>
              <p className="mt-2 text-sm text-(--muted-foreground)">
                {siteConfig.description}
              </p>
            </div>
            <p className="max-w-md text-sm leading-6 text-(--muted-foreground)">
              Monolith application structure with modular frontend boundaries for
              UI system growth.
            </p>
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}

