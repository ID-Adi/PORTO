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
        className="rounded-lg select-none corner-squircle supports-corner-shape:rounded-[50%]"
        src={src}
        alt={alt}
        width={32}
        height={32}
        quality={100}
        unoptimized
      />
      <div className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-black/10 corner-squircle ring-inset dark:ring-white/15 supports-corner-shape:rounded-[50%]" />
    </div>
  );
}
