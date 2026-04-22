"use client";

import { Moon, Sun } from "lucide-react";
import type { MouseEvent } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "@/shared/providers/theme-provider";

type TransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => {
    ready: Promise<void>;
  };
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const state = theme;

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    const { clientX: x, clientY: y } = event;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const nextTheme = theme === "dark" ? "light" : "dark";
    const transitionDocument = document as TransitionDocument;

    if (reduceMotion || !transitionDocument.startViewTransition) {
      setTheme(nextTheme);
      return;
    }

    const transition = transitionDocument.startViewTransition(() => {
      setTheme(nextTheme);
    });

    void transition.ready.then(() => {
      document.documentElement.animate(
        [
          { clipPath: `circle(0% at ${x}px ${y}px)` },
          { clipPath: `circle(150% at ${x}px ${y}px)` },
        ],
        {
          duration: 500,
          easing: "ease-in-out",
          pseudoElement: "::view-transition-new(root)",
        }
      );
    });
  };

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="border-none hover:bg-transparent"
      onClick={handleClick}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      data-state={state}
    >
      <span className="relative size-4">
        <Sun
          className={cn(
            "absolute inset-0 transition-opacity duration-200",
            state === "dark" ? "opacity-100" : "opacity-0"
          )}
        />
        <Moon
          className={cn(
            "absolute inset-0 transition-opacity duration-200",
            state === "light" ? "opacity-100" : "opacity-0"
          )}
        />
      </span>
    </Button>
  );
}
