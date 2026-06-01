"use client";

import { ArrowUpRight, ImageIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { PublicSocial } from "@/features/public-data/types";

import { RailSection, socialBrands } from "./profile-sheet";
import { SocialLogoTile } from "../components/social-logo-tile";

type Social = PublicSocial;

const MAX = 6;

function getIconSrc(item: Social): string | null {
  if (item.iconUrl) return item.iconUrl;
  return socialBrands[item.label]?.src ?? null;
}

function SocialCard({ item }: { item: Social }) {
  const src = getIconSrc(item);
  return (
    <a
      href={item.href}
      target="_blank"
      rel="noopener"
      className={cn(
        "social-link-grid-item flex cursor-pointer items-center gap-4 p-4 pr-2 transition-[background-color] ease-out hover:bg-accent-muted",
      )}
    >
      {src ? (
        <SocialLogoTile src={src} alt={item.label} />
      ) : (
        <div className="flex size-8 items-center justify-center border border-(--line) bg-(--muted)/40 text-(--muted-foreground)">
          <ImageIcon className="size-4" />
        </div>
      )}

      <h3 className="flex-1 font-medium">{item.label}</h3>
      <ArrowUpRight className="size-4 text-muted-foreground" />
    </a>
  );
}

function EmptySocialCard() {
  return (
    <div
      aria-hidden
      className="surface-hatch flex items-center gap-4 border border-dashed border-(--line) p-4 pr-2 opacity-50"
    >
      <div className="flex size-8 items-center justify-center border border-dashed border-(--line) bg-transparent text-(--muted-foreground)/60">
        <ImageIcon className="size-4" />
      </div>
      <span className="flex-1 font-medium text-(--muted-foreground)/60">—</span>
    </div>
  );
}

export function SocialRailDbSection({ socials: data = [] }: { socials?: Social[] }) {
  const socials = data.slice(0, MAX);
  const emptyCount = Math.max(0, MAX - socials.length);

  return (
    <RailSection
      id="socials"
      title="Social Links"
      className="after:content-none"
    >
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 -z-1 grid grid-cols-2 gap-2 md:grid-cols-3">
          <div className="border-r border-line" />
          <div className="border-l border-line md:border-x" />
          <div className="border-l border-line max-md:hidden" />
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {socials.map((item) => (
            <SocialCard key={item.id} item={item} />
          ))}
          {Array.from({ length: emptyCount }).map((_, i) => (
            <EmptySocialCard key={`empty-${i}`} />
          ))}
        </div>
      </div>
    </RailSection>
  );
}
