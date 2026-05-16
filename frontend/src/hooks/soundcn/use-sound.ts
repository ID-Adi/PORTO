"use client";

import { useCallback, useRef, useState } from "react";

import type {
  PlayFunction,
  SoundAsset,
  SoundControls,
  UseSoundOptions,
  UseSoundReturn,
} from "@/lib/sound-types";
import { playSound, type SoundPlayback } from "@/lib/sound-engine";

export function useSound(
  asset: SoundAsset,
  options: UseSoundOptions = {},
): UseSoundReturn {
  const {
    volume = 1,
    playbackRate = 1,
    interrupt = false,
    soundEnabled = true,
    onPlay,
    onEnd,
    onPause,
    onStop,
  } = options;

  const [isPlaying, setIsPlaying] = useState(false);
  const playbackRef = useRef<SoundPlayback | null>(null);

  const play: PlayFunction = useCallback(
    (overrides) => {
      if (!soundEnabled) return;
      if (interrupt && playbackRef.current) {
        playbackRef.current.stop();
      }
      setIsPlaying(true);
      onPlay?.();
      playSound(asset.dataUri, {
        volume: overrides?.volume ?? volume,
        playbackRate: overrides?.playbackRate ?? playbackRate,
        onEnd: () => {
          setIsPlaying(false);
          onEnd?.();
        },
      }).then((pb) => {
        playbackRef.current = pb;
      });
    },
    [asset.dataUri, volume, playbackRate, interrupt, soundEnabled, onPlay, onEnd],
  );

  const stop = useCallback(() => {
    playbackRef.current?.stop();
    setIsPlaying(false);
    onStop?.();
  }, [onStop]);

  const pause = useCallback(() => {
    // Web Audio API doesn't natively support pause on BufferSource
    playbackRef.current?.stop();
    setIsPlaying(false);
    onPause?.();
  }, [onPause]);

  const controls: SoundControls = {
    stop,
    pause,
    isPlaying,
    duration: asset.duration,
    sound: asset,
  };

  return [play, controls] as const;
}
