import { SiteShell } from "@/layout/site-shell";
import { ContactSocialsSkeleton } from "@/components/skeletons/contact-socials-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function ContactLoading() {
  return (
    <SiteShell>
      <div className="page-frame border-x border-(--line)">
        <section>
          <header className="screen-line-bottom px-4 py-6 sm:px-5">
            <h1 className="text-3xl font-semibold tracking-tight">Contact</h1>
            <p className="mt-2 text-sm text-(--muted-foreground)">
              Have a project in mind or want to collaborate? Send a message.
            </p>
          </header>

          <div className="grid gap-0 lg:grid-cols-2">
            {/* Form (statis — placeholder input) */}
            <div className="space-y-4 border-b border-(--line) px-4 py-6 sm:px-5 lg:border-b-0 lg:border-r">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="mb-1.5 h-3 w-16" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
              <div>
                <Skeleton className="mb-1.5 h-3 w-16" />
                <Skeleton className="h-28 w-full" />
              </div>
              <Skeleton className="h-9 w-36" />
            </div>

            {/* Social links */}
            <div className="px-4 py-6 sm:px-5">
              <h2 className="font-mono text-[11px] font-medium tracking-wider text-(--muted-foreground) uppercase">
                Connect
              </h2>
              <ContactSocialsSkeleton />
            </div>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
