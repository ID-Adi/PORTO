"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export function ScrollToTop() {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const updateMotionPreference = () => {
      setReduceMotion(mediaQuery.matches);
    };

    const handleScroll = () => {
      setIsVisible(window.scrollY >= 400);
    };

    updateMotionPreference();
    handleScroll();

    mediaQuery.addEventListener("change", updateMotionPreference);
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      mediaQuery.removeEventListener("change", updateMotionPreference);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <button
      type="button"
      aria-label="Scroll to top"
      onClick={() =>
        window.scrollTo({
          top: 0,
          behavior: reduceMotion ? "auto" : "smooth",
        })
      }
      className={cn(
        "fixed right-6 bottom-6 z-50 flex size-9 items-center justify-center border border-(--line) bg-background transition-all duration-300",
        isVisible
          ? "translate-y-0 opacity-100"
          : reduceMotion
            ? "pointer-events-none opacity-0"
            : "pointer-events-none translate-y-4 opacity-0"
      )}
    >
      <ArrowUp className="size-4" />
    </button>
  );
}
