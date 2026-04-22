"use client";

import { forwardRef, useState } from "react";

import { cn } from "@/lib/utils";

type GlowCardProps = React.ComponentProps<"article">;

export const GlowCard = forwardRef<HTMLElement, GlowCardProps>(function GlowCard({
  className,
  onPointerMove,
  style,
  ...props
}, ref) {
  const [pointer, setPointer] = useState({ x: "50cqw", y: "50cqh" });

  return (
    <article
      ref={ref}
      className={cn("glow-card relative overflow-hidden", className)}
      style={
        {
          ...style,
          "--pointer-x": pointer.x,
          "--pointer-y": pointer.y,
        } as React.CSSProperties
      }
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;

        setPointer({ x: `${x}cqw`, y: `${y}cqh` });
        onPointerMove?.(event);
      }}
      {...props}
    />
  );
});
