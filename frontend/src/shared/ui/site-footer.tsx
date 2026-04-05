const footerLinks = [
  { href: "https://porto.dev/llms.txt", label: "llms.txt" },
  { href: "https://github.com", label: "GitHub" },
  { href: "https://linkedin.com", label: "LinkedIn" },
  { href: "mailto:hello@porto.dev", label: "Email" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-(--line)">
      <div className="page-frame border-x border-(--line) px-4 py-6 pb-20">
        <p className="text-[12px] text-(--muted-foreground)">
          Inspired by technical editorial interfaces, adapted for PORTO.
        </p>
        <p className="mt-2 text-[12px] text-(--muted-foreground)">
          Built by Adi. Source and experiments live in the same monolith because apparently I enjoy neat little boxes.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px]">
          {footerLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="text-(--muted-foreground) transition-colors hover:text-(--foreground)"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
