import { ExternalLink, Globe, Mail } from "lucide-react";

const socialLinks = [
  { icon: Mail, href: "mailto:hello@porto.dev", label: "Email" },
  { icon: ExternalLink, href: "https://github.com", label: "GitHub" },
  { icon: Globe, href: "https://linkedin.com", label: "LinkedIn" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-(--line)">
      <div className="mx-auto flex w-[calc(100%-2rem)] max-w-[768px] items-center justify-between px-2 py-5 sm:px-5 md:w-full md:px-8">
        <p className="text-xs text-(--muted-foreground)">
          © {new Date().getFullYear()} PORTO. Built with discipline.
        </p>
        <div className="flex items-center gap-3">
          {socialLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={link.label}
              className="text-(--muted-foreground) transition-colors hover:text-(--foreground)"
            >
              <link.icon className="h-4 w-4" />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
