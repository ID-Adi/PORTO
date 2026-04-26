"use client";

import Image from "next/image";

type SocialLogoTileProps = {
  src: string;
  alt: string;
};

export function SocialLogoTile({ src, alt }: SocialLogoTileProps) {
  return (
    <div className="relative size-8 shrink-0">
      <Image
        className="rounded-lg select-none"
        src={src}
        alt={alt}
        width={32}
        height={32}
        quality={100}
        unoptimized
      />
      <div className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-black/10 ring-inset dark:ring-white/15" />
    </div>
  );
}
