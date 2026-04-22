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
};

export function PronounceButton({ name }: PronounceButtonProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);

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

  const handleClick = async () => {
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
      if (!audioRef.current) {
        return;
      }

      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    };
  }, []);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => void handleClick()}
          className="inline-flex h-8 w-8 items-center justify-center text-(--muted-foreground) transition-colors hover:text-(--foreground) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--ring)"
          aria-label={`Pronounce ${name}`}
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
        {hasError ? "Audio unavailable" : "Pronounce name"}
      </TooltipContent>
    </Tooltip>
  );
}
