"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type CopyState = "idle" | "done" | "error";

export function useCopyToClipboard(timeout = 2000) {
  const timerRef = useRef<number | null>(null);
  const [state, setState] = useState<CopyState>("idle");

  const copy = useCallback(
    async (value: string) => {
      try {
        await navigator.clipboard.writeText(value);
        setState("done");
        return true;
      } catch {
        setState("error");
        return false;
      }
    },
    []
  );

  useEffect(() => {
    if (state === "idle") {
      return undefined;
    }

    timerRef.current = window.setTimeout(() => {
      setState("idle");
    }, timeout);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [state, timeout]);

  return {
    copy,
    state,
  };
}
