import { SiteFooter } from "@/shared/ui/site-footer";
import { SiteHeader } from "@/shared/ui/site-header";
import { FloatingNav } from "@/modules/home/components/floating-nav";

type SiteShellProps = {
  children: React.ReactNode;
};

export function SiteShell({ children }: SiteShellProps) {
  return (
    <div className="relative w-full">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
      <FloatingNav />
    </div>
  );
}
