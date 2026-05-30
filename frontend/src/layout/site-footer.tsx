import { RssIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Icons } from "@/layout/icons";
import { SiteFooterInteractiveLogotype } from "@/layout/site-footer-brand";

export function SiteFooter() {
  return (
    <footer className="max-w-screen overflow-x-hidden px-2">
      <div className="screen-line-top page-frame relative border-x border-line pt-4">
        <p className="mb-4 px-4 text-center font-mono text-sm text-balance text-muted-foreground">
          Open for freelance &amp; collaboration ( Untuk Video storytelling,
          motion graphic, Web Company - PORTO - Web ERP, App Mobile, Design
          Grafic )
        </p>

        <div className="screen-line-top screen-line-bottom relative flex w-full before:z-1 after:z-1">
          <div className="relative z-2 mx-auto flex items-center justify-center gap-3 border-x border-y border-line bg-background px-4">
            <DisabledItem
              aria-label="llms.txt (disabled)"
              className="font-mono text-xs font-medium max-sm:hidden"
            >
              llms.txt
            </DisabledItem>

            <Separator className="max-sm:hidden" />

            <DisabledItem aria-label="X (disabled)">
              <Icons.x className="size-4" />
            </DisabledItem>

            <Separator />

            <DisabledItem aria-label="GitHub (disabled)">
              <Icons.gitHub className="size-4" />
            </DisabledItem>

            <Separator />

            <DisabledItem aria-label="LinkedIn (disabled)">
              <Icons.linkedIn className="size-4" />
            </DisabledItem>

            <Separator />

            <DisabledItem aria-label="RSS (disabled)">
              <RssIcon className="size-4" />
            </DisabledItem>
          </div>
        </div>

        <div className="*:absolute *:z-2 *:flex *:size-2 *:border *:border-line *:bg-background">
          <div className="bottom-[-3.5px] left-[-4.5px]" />
          <div className="right-[-4.5px] bottom-[-3.5px]" />
        </div>
      </div>

      <SiteFooterInteractiveLogotype />

      <div className="pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex h-16 sm:h-2" />
      </div>
    </footer>
  );
}

function Separator({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex h-11 w-px bg-line", className)}
      aria-hidden
      {...props}
    />
  );
}

function DisabledItem({
  className,
  children,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-disabled="true"
      title="Disabled"
      className={cn(
        "relative inline-flex cursor-not-allowed items-center justify-center overflow-hidden rounded-sm border border-line px-1.5 py-1 text-muted-foreground/60 select-none",
        "bg-[repeating-linear-gradient(135deg,var(--line)_0_1px,transparent_1px_6px)]",
        className
      )}
      {...props}
    >
      <span className="relative z-10 opacity-50">{children}</span>
    </span>
  );
}
