"use client";

import { motion } from "motion/react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

export type AnimatedVolumeIconHandle = {
  startAnimation: () => void;
  stopAnimation: () => void;
};

type AnimatedVolumeIconProps = React.ComponentProps<"svg"> & {
  active?: boolean;
};

export const AnimatedVolumeIcon = forwardRef<
  AnimatedVolumeIconHandle,
  AnimatedVolumeIconProps
>(function AnimatedVolumeIcon({ active = false, ...props }, ref) {
  const timeoutRef = useRef<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(active);

  const stopAnimation = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    setIsAnimating(false);
  }, []);

  const startAnimation = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    setIsAnimating(true);
    timeoutRef.current = window.setTimeout(() => {
      setIsAnimating(false);
    }, 900);
  }, []);

  useImperativeHandle(ref, () => ({
    startAnimation,
    stopAnimation,
  }));

  useEffect(() => {
    setIsAnimating(active);
  }, [active]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M4 14h3l4 4V6l-4 4H4z" />
      {[0, 1, 2].map((index) => (
        <motion.path
          key={index}
          d={`M${14 + index * 2} ${8 + index}c1.4 1 1.4 ${6 - index * 2} 0 ${7 - index}`}
          animate={
            isAnimating
              ? {
                  opacity: [0.35, 1, 0.45],
                }
              : { opacity: 1 }
          }
          transition={{
            duration: 0.6,
            repeat: isAnimating ? Number.POSITIVE_INFINITY : 0,
            delay: index * 0.08,
            ease: "easeInOut",
          }}
        />
      ))}
    </svg>
  );
});
