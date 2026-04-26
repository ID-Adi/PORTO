"use client";

import { motion, useMotionValue, useSpring } from "motion/react";

const VIEWBOX_WIDTH = 1200;
const VIEWBOX_HEIGHT = 260;
const DEFAULT_GRADIENT_X = VIEWBOX_WIDTH / 2;

export function SiteFooterInteractiveLogotype() {
  const gradientX1Raw = useMotionValue(DEFAULT_GRADIENT_X);
  const gradientX1 = useSpring(gradientX1Raw, {
    stiffness: 200,
    damping: 30,
    mass: 0.5,
  });

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const normalized = (mouseX / rect.width) * VIEWBOX_WIDTH;
    gradientX1Raw.set(Math.max(0, Math.min(VIEWBOX_WIDTH, normalized)));
  };

  const handleMouseLeave = () => {
    gradientX1Raw.set(DEFAULT_GRADIENT_X);
  };

  return (
    <div className="screen-line-bottom relative after:z-1 after:bg-foreground/10">
      <div
        className="overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div className="flex w-full items-center justify-center">
          <svg
            className="page-frame size-full"
            viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <text
              x="50%"
              y={VIEWBOX_HEIGHT}
              textAnchor="middle"
              dominantBaseline="text-after-edge"
              fontFamily="var(--font-pixel-square), var(--font-mono), monospace"
              fontSize="240"
              fontWeight="700"
              letterSpacing="24"
              fill="url(#porto-footer-gradient)"
              stroke="currentColor"
              strokeWidth="2"
              className="text-foreground/10"
              style={{ paintOrder: "stroke" }}
            >
              PORTO
            </text>
            <defs>
              <motion.linearGradient
                id="porto-footer-gradient"
                x1={gradientX1}
                y1="1"
                x2={DEFAULT_GRADIENT_X}
                y2={VIEWBOX_HEIGHT}
                gradientUnits="userSpaceOnUse"
              >
                <stop
                  offset="0.625"
                  stopColor="var(--foreground)"
                  stopOpacity="0"
                />
                <stop offset="1" stopColor="var(--foreground)" />
              </motion.linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    </div>
  );
}
