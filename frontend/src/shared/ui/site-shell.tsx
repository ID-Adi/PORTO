import { SiteFooter } from "@/shared/ui/site-footer";
import { SiteHeader } from "@/shared/ui/site-header";
import { ScrollToTop } from "@/shared/ui/scroll-to-top";

type SiteShellProps = {
  children: React.ReactNode;
};

export function SiteShell({ children }: SiteShellProps) {
  return (
    <div className="group/site relative w-full">
      <SiteHeader />
      <main className="max-w-screen overflow-x-hidden px-2">{children}</main>
      <SiteFooter />
      <ScrollToTop />
    </div>
  );
}
