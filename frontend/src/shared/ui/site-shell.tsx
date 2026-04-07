import { SiteFooter } from "@/shared/ui/site-footer";
import { SiteHeader } from "@/shared/ui/site-header";
import { FloatingNav } from "@/modules/home/components/floating-nav";
import { ContentRails } from "@/shared/ui/content-rails";

type SiteShellProps = {
  children: React.ReactNode;
};

export function SiteShell({ children }: SiteShellProps) {
  return (
    <div data-site-shell-root className="relative isolate w-full">
      <div aria-hidden="true" className="site-grid-overlay" />
      <ContentRails />
      <div className="relative z-10">
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
        <FloatingNav />
      </div>
    </div>
  );
}
