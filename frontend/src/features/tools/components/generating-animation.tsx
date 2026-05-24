"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type GeneratingAnimationProps = {
  label?: string;
  startedAt?: number | null;
};

function formatElapsed(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

export function GeneratingAnimation({
  label = "AI Generating",
  startedAt,
}: GeneratingAnimationProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    const startedAtValue = startedAt;
    const id = setInterval(
      () => setElapsed(Date.now() - startedAtValue),
      250,
    );
    return () => clearInterval(id);
  }, [startedAt]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "relative h-full w-full overflow-hidden border border-(--line) bg-(--muted)/30",
      )}
    >
      {/* Hatched background */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[repeating-linear-gradient(45deg,var(--color-line)_0,var(--color-line)_1px,transparent_1px,transparent_8px)] opacity-40"
      />

      {/* Sweeping scan line */}
      <motion.div
        aria-hidden
        initial={{ y: "-100%" }}
        animate={{ y: "100%" }}
        transition={{
          duration: 1.8,
          ease: "easeInOut",
          repeat: Infinity,
          repeatType: "reverse",
        }}
        className="absolute inset-x-0 h-px bg-(--foreground)/70 shadow-[0_0_18px_2px_var(--color-foreground)]"
      />

      {/* Subtle gradient pulse */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0.05 }}
        animate={{ opacity: [0.05, 0.18, 0.05] }}
        transition={{
          duration: 2.4,
          ease: "easeInOut",
          repeat: Infinity,
        }}
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--color-foreground),transparent_60%)]"
      />

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 font-mono">
        <div className="flex items-end gap-0.5">
          {[0, 1, 2, 3].map((bar) => (
            <motion.span
              key={bar}
              aria-hidden
              animate={{ scaleY: [0.35, 1, 0.35] }}
              transition={{
                duration: 1,
                ease: "easeInOut",
                repeat: Infinity,
                delay: bar * 0.12,
              }}
              className="block h-5 w-1 origin-bottom bg-(--foreground)"
            />
          ))}
        </div>

        <div className="text-[11px] tracking-[0.18em] uppercase text-(--foreground)">
          {label}
          <motion.span
            aria-hidden
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="ml-0.5 inline-block"
          >
            ▌
          </motion.span>
        </div>

        {startedAt ? (
          <div className="text-[10px] tabular-nums tracking-[0.2em] text-(--muted-foreground)">
            {formatElapsed(elapsed)}
          </div>
        ) : null}
      </div>

      {/* Corner ticks */}
      {(
        [
          "left-0 top-0",
          "right-0 top-0 rotate-90",
          "left-0 bottom-0 -rotate-90",
          "right-0 bottom-0 rotate-180",
        ] as const
      ).map((position) => (
        <span
          key={position}
          aria-hidden
          className={cn(
            "absolute size-2.5 border-t border-l border-(--foreground)/50",
            position,
          )}
        />
      ))}
    </div>
  );
}
