import { RssIcon } from "lucide-react";

import { Icons } from "@/shared/ui/icons";

const footerLinks = [
  { href: "https://porto.dev/llms.txt", label: "llms.txt" },
  { href: "https://github.com", label: "GitHub" },
  { href: "https://linkedin.com", label: "LinkedIn" },
  { href: "mailto:hello@porto.dev", label: "Email" },
];

export function SiteFooter() {
  return (
    <footer className="max-w-screen overflow-x-hidden px-2 pb-24 pt-2">
      <div className="screen-line-top page-frame relative border-x border-(--line) pt-4">
        <p className="mb-1 px-4 text-center font-mono text-sm text-balance text-(--muted-foreground)">
          Inspired by technical editorial interfaces and rebuilt to follow the
          chanhdai.com structural rhythm as closely as possible.
        </p>

        <p className="mb-4 px-4 text-center font-mono text-sm text-balance text-(--muted-foreground)">
          Built by Adi. The content stays PORTO, the rails stay strict, and the
          boxes remain suspiciously neat.
        </p>

        <div className="screen-line-top screen-line-bottom flex w-full">
          <div className="mx-auto flex items-center justify-center gap-3 border-x border-(--line) bg-background px-4">
            {footerLinks.map((link, index) => (
              <a
                key={link.label}
                className="flex font-mono text-xs font-medium text-(--muted-foreground) transition-colors hover:text-(--foreground)"
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.label}
              </a>
            ))}

            <Separator />

            <a
              className="flex items-center text-(--muted-foreground) transition-colors hover:text-(--foreground)"
              href="https://x.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icons.x className="size-4" />
              <span className="sr-only">X</span>
            </a>

            <Separator />

            <a
              className="flex items-center text-(--muted-foreground) transition-colors hover:text-(--foreground)"
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icons.gitHub className="size-4" />
              <span className="sr-only">GitHub</span>
            </a>

            <Separator />

            <a
              className="flex items-center text-(--muted-foreground) transition-colors hover:text-(--foreground)"
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icons.linkedIn className="size-4" />
              <span className="sr-only">LinkedIn</span>
            </a>

            <Separator />

            <a
              className="flex items-center text-(--muted-foreground) transition-colors hover:text-(--foreground)"
              href="https://porto.dev/rss"
              target="_blank"
              rel="noopener noreferrer"
            >
              <RssIcon className="size-4" />
              <span className="sr-only">RSS</span>
            </a>
          </div>
        </div>

        <div className="absolute bottom-[-3.5px] left-[-4.5px] size-2 border border-(--line) bg-background" />
        <div className="absolute right-[-4.5px] bottom-[-3.5px] size-2 border border-(--line) bg-background" />
      </div>
    </footer>
  );
}

function Separator() {
  return <div className="hidden h-11 w-px bg-(--line) sm:flex" aria-hidden />;
}
