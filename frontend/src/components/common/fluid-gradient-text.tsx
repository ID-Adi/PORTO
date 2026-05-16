"use client";

import { useId } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

import { cn } from "@/lib/utils";

export type FluidGradientTextProps = {
  text: string;
  className?: string;
  svgClassName?: string;
  svgViewBoxWidth?: number;
  svgViewBoxHeight?: number;
  fontFamily?: string;
  fontWeight?: number | string;
  letterSpacing?: number | string;
  strokeOpacity?: number;
  strokeWidth?: number;
};

export function FluidGradientText({
  text,
  className,
  svgClassName,
  svgViewBoxWidth = 1200,
  svgViewBoxHeight = 300,
  fontFamily = "var(--font-sans)",
  fontWeight = 700,
  letterSpacing = 0,
  strokeOpacity = 0.1,
  strokeWidth = 2,
}: FluidGradientTextProps) {
  const gradientId = useId().replaceAll(":", "");
  const defaultGradientX = svgViewBoxWidth / 2;
  const gradientX1Raw = useMotionValue(defaultGradientX);
  const gradientX1 = useSpring(gradientX1Raw, {
    stiffness: 200,
    damping: 30,
    mass: 0.5,
  });

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const normalizedX = (pointerX / rect.width) * svgViewBoxWidth;

    gradientX1Raw.set(Math.max(0, Math.min(svgViewBoxWidth, normalizedX)));
  };

  const handleMouseLeave = () => {
    gradientX1Raw.set(defaultGradientX);
  };

  return (
    <div
      className={cn("relative size-full overflow-hidden", className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <svg
        className={cn("size-full translate-y-[37.5%] select-none", svgClassName)}
        viewBox={`0 0 ${svgViewBoxWidth} ${svgViewBoxHeight}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          fill={`url(#${gradientId})`}
          stroke="currentColor"
          strokeOpacity={strokeOpacity}
          strokeWidth={strokeWidth}
          style={{
            fontFamily,
            fontSize: svgViewBoxHeight,
            fontWeight,
            letterSpacing,
            paintOrder: "stroke",
          }}
        >
          {text}
        </text>
        <defs>
          <motion.linearGradient
            id={gradientId}
            x1={gradientX1}
            y1="1"
            x2={defaultGradientX}
            y2={svgViewBoxHeight}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0.625" stopColor="currentColor" stopOpacity="0" />
            <stop offset="1" stopColor="currentColor" />
          </motion.linearGradient>
        </defs>
      </svg>
    </div>
  );
}
