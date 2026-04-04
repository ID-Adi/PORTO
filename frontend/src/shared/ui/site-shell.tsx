import { SiteFooter } from "@/shared/ui/site-footer";
import { SiteHeader } from "@/shared/ui/site-header";

type SiteShellProps = {
  children: React.ReactNode;
};

export function SiteShell({ children }: SiteShellProps) {
  return (
    <div className="relative w-full">
      {/* ── Fixed Global Vertical Lines Overlay ── */}
      <div className="pointer-events-none fixed inset-0 z-[100] flex justify-center">
        <div className="h-full w-[calc(100%-2rem)] max-w-[768px] border-x border-(--line) md:w-full" />
      </div>

      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
