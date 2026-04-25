import { RssIcon } from "lucide-react";

import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { Icons } from "@/layout/icons";
import { SiteFooterInteractiveLogotype } from "@/layout/site-footer-brand";

const SOURCE_CODE_URL = `https://github.com/${siteConfig.githubUsername}/porto`;

export function SiteFooter() {
  return (
    <footer className="max-w-screen overflow-x-hidden px-2">
      <div className="screen-line-top page-frame relative border-x border-line pt-4">
        <p className="mb-1 px-4 text-center font-mono text-sm text-balance text-muted-foreground [&_span]:mx-0.5 [&_span]:inline-block">
          Inspired by chanhdai.com<span>/</span>tailwindcss.com<span>/</span>
          ui.shadcn.com
        </p>

        <p className="mb-4 px-4 text-center font-mono text-sm text-balance text-muted-foreground">
          Built with care by{" "}
          <a
            className="font-medium text-foreground underline decoration-line decoration-1 underline-offset-4 transition-colors hover:decoration-foreground"
            href="https://x.com/porto"
            target="_blank"
            rel="noopener"
          >
            Adi
          </a>
          . The source code is available on{" "}
          <a
            className="font-medium text-foreground underline decoration-line decoration-1 underline-offset-4 transition-colors hover:decoration-foreground"
            href={SOURCE_CODE_URL}
            target="_blank"
            rel="noopener"
          >
            GitHub
          </a>
          .
        </p>

        <div className="screen-line-top screen-line-bottom relative flex w-full before:z-1 after:z-1">
          <div className="relative z-2 mx-auto flex items-center justify-center gap-3 border-x border-y border-line bg-background px-4">
            <a
              className="flex font-mono text-xs font-medium text-muted-foreground transition-colors hover:text-foreground max-sm:hidden"
              href={`${siteConfig.url}/llms.txt`}
              target="_blank"
              rel="noopener"
            >
              llms.txt
            </a>

            <Separator className="max-sm:hidden" />

            <a
              className="flex items-center text-muted-foreground transition-colors hover:text-foreground"
              href="https://x.com/porto"
              target="_blank"
              rel="noopener"
              aria-label="X"
            >
              <Icons.x className="size-4" />
            </a>

            <Separator />

            <a
              className="flex items-center text-muted-foreground transition-colors hover:text-foreground"
              href={`https://github.com/${siteConfig.githubUsername}`}
              target="_blank"
              rel="noopener"
              aria-label="GitHub"
            >
              <Icons.gitHub className="size-4" />
            </a>

            <Separator />

            <a
              className="flex items-center text-muted-foreground transition-colors hover:text-foreground"
              href="https://www.linkedin.com/in/porto"
              target="_blank"
              rel="noopener"
              aria-label="LinkedIn"
            >
              <Icons.linkedIn className="size-4" />
            </a>

            <Separator />

            <a
              className="flex items-center text-muted-foreground transition-colors hover:text-foreground"
              href={`${siteConfig.url}/api/rss`}
              target="_blank"
              rel="noopener"
              aria-label="RSS"
            >
              <RssIcon className="size-4" />
            </a>
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
