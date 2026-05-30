"use client";

import { useId } from "react";

import { cn } from "@/lib/utils";
import { normalizeImageUrl } from "@/lib/image-url";

type ThumbImageProps = {
  src?: string | null;
  alt?: string;
  className?: string;
};

export function ThumbImage({ src, alt = "", className }: ThumbImageProps) {
  const patternId = useId();
  const url = normalizeImageUrl(src);

  return (
    <div className={cn("relative overflow-hidden bg-zinc-950", className)}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={alt}
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <svg className="absolute inset-0 size-full opacity-40" aria-hidden="true">
          <pattern
            id={patternId}
            width="4"
            height="4"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="4" stroke="white" strokeWidth="1" />
          </pattern>
          <rect width="100%" height="100%" fill={`url(#${patternId})`} />
        </svg>
      )}
    </div>
  );
}
