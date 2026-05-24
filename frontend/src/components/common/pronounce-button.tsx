"use client";

import { Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type PronounceButtonProps = {
  name: string;
  pronunciationText: string;
};

export function PronounceButton({
  name,
  pronunciationText,
}: PronounceButtonProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showText, setShowText] = useState(false);

  const ensureAudio = () => {
    if (audioRef.current) {
      return audioRef.current;
    }

    const audio = new Audio("/audio/name-pronunciation.mp3");

    audio.addEventListener("ended", () => {
      setIsPlaying(false);
    });
    audio.addEventListener("pause", () => {
      setIsPlaying(false);
    });
    audio.addEventListener("error", () => {
      setHasError(true);
      setIsPlaying(false);
    });

    audioRef.current = audio;

    return audio;
  };

  const revealText = () => {
    setShowText(true);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = setTimeout(() => {
      setShowText(false);
    }, 2800);
  };

  const handleClick = async () => {
    revealText();

    const audio = ensureAudio();

    if (hasError) {
      return;
    }

    try {
      audio.currentTime = 0;
      setIsPlaying(true);
      await audio.play();
    } catch {
      setHasError(true);
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
      if (!audioRef.current) {
        return;
      }

      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    };
  }, []);

  return (
    <span className="inline-flex items-center gap-1.5">
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => void handleClick()}
          className="inline-flex h-8 w-8 items-center justify-center text-(--muted-foreground) transition-colors hover:text-(--foreground) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring)"
          aria-label={`Lafalkan ${name}`}
        >
          {isPlaying && !hasError ? (
            <span className="flex items-end gap-0.5" aria-hidden>
              {[0, 1, 2].map((bar) => (
                <span
                  key={bar}
                  className={cn(
                    "pronounce-bar block w-0.5 rounded-full bg-current",
                    bar === 0 ? "h-2" : bar === 1 ? "h-3.5" : "h-5"
                  )}
                  style={{ animationDelay: `${bar * 0.12}s` }}
                />
              ))}
            </span>
          ) : (
            <Volume2 className="size-4.5" aria-hidden />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent sideOffset={8}>
        {hasError ? "Audio tidak tersedia" : "Lafalkan nama"}
      </TooltipContent>
    </Tooltip>
      <span
        aria-live="polite"
        className={cn(
          "pointer-events-none inline-flex items-center font-mono text-xs tracking-wide text-(--muted-foreground) transition-all duration-300 ease-out",
          showText
            ? "max-w-[14rem] translate-x-0 opacity-100"
            : "max-w-0 -translate-x-1 overflow-hidden opacity-0"
        )}
      >
        <span className="whitespace-nowrap">{pronunciationText}</span>
      </span>
    </span>
  );
}
