import { SiteFooter } from "@/layout/site-footer";
import { SiteHeader } from "@/layout/site-header";

type SiteShellProps = {
  children: React.ReactNode;
};

export function SiteShell({ children }: SiteShellProps) {
  return (
    <div className="group/site relative z-10 w-full">
      <SiteHeader />
      <main className="max-w-screen overflow-x-hidden px-2">{children}</main>
      <SiteFooter />
    </div>
  );
}
