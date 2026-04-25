"use client";

import { Moon, Sun } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useRef } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/theme-provider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const playToggleSound = useToggleSound();

  const handleClick = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";

    playToggleSound(nextTheme);
    setTheme(nextTheme);
  };

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="border-none hover:bg-transparent"
      onClick={handleClick}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      data-state={theme}
    >
      <motion.span
        className="relative flex size-4 items-center justify-center"
        whileTap={{ scale: 0.82, rotate: theme === "dark" ? -18 : 18 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        <motion.span
          className={cn(
            "absolute inset-0",
            theme === "dark" ? "opacity-100" : "opacity-0"
          )}
          animate={{
            opacity: theme === "dark" ? 1 : 0,
            rotate: theme === "dark" ? 0 : -90,
            scale: theme === "dark" ? 1 : 0.62,
          }}
          transition={{ duration: 0.24, ease: "easeOut" }}
        >
          <Sun className="size-4" />
        </motion.span>
        <motion.span
          className={cn(
            "absolute inset-0",
            theme === "light" ? "opacity-100" : "opacity-0"
          )}
          animate={{
            opacity: theme === "light" ? 1 : 0,
            rotate: theme === "light" ? 0 : 90,
            scale: theme === "light" ? 1 : 0.62,
          }}
          transition={{ duration: 0.24, ease: "easeOut" }}
        >
          <Moon className="size-4" />
        </motion.span>
      </motion.span>
    </Button>
  );
}

function useToggleSound() {
  const audioContextRef = useRef<AudioContext | null>(null);

  return useCallback((theme: "light" | "dark") => {
    if (typeof window === "undefined") {
      return;
    }

    const AudioContextClass =
      window.AudioContext ??
      (
        window as Window &
          typeof globalThis & {
            webkitAudioContext?: typeof AudioContext;
          }
      ).webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    const audioContext =
      audioContextRef.current ??
      new AudioContextClass({ latencyHint: "interactive" });
    audioContextRef.current = audioContext;

    if (audioContext.state === "suspended") {
      void audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;
    const baseFrequency = theme === "dark" ? 210 : 420;

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(baseFrequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(
      baseFrequency * 1.35,
      now + 0.055
    );

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.035, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.13);

    oscillator.addEventListener("ended", () => {
      oscillator.disconnect();
      gain.disconnect();
    });
  }, []);
}
