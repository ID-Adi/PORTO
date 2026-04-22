"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UseSoundResult = {
  play: () => Promise<void>;
  preload: () => void;
  isPlaying: boolean;
  hasError: boolean;
};

export function useSound(url: string): UseSoundResult {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);

  const ensureAudio = useCallback(() => {
    if (typeof window === "undefined") {
      return null;
    }

    if (!audioRef.current) {
      const audio = new Audio(url);

      audio.preload = "none";
      audio.addEventListener("play", () => setIsPlaying(true));
      audio.addEventListener("pause", () => setIsPlaying(false));
      audio.addEventListener("ended", () => setIsPlaying(false));
      audio.addEventListener("error", () => {
        setHasError(true);
        setIsPlaying(false);
      });
      audioRef.current = audio;
    }

    return audioRef.current;
  }, [url]);

  const preload = useCallback(() => {
    const audio = ensureAudio();

    if (!audio || hasError) {
      return;
    }

    audio.preload = "auto";
    audio.load();
  }, [ensureAudio, hasError]);

  const play = useCallback(async () => {
    const audio = ensureAudio();

    if (!audio || hasError) {
      return;
    }

    try {
      audio.currentTime = 0;
      await audio.play();
    } catch {
      setHasError(true);
      setIsPlaying(false);
    }
  }, [ensureAudio, hasError]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  return {
    play,
    preload,
    isPlaying,
    hasError,
  };
}
