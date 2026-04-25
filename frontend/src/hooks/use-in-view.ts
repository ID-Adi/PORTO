"use client";

import { useEffect, useRef, useState } from "react";

type UseInViewOptions = IntersectionObserverInit & {
  once?: boolean;
};

export function useInView(options: UseInViewOptions = {}) {
  const { once = true, ...observerOptions } = options;
  const ref = useRef<HTMLElement | null>(null);
  const [isInView, setIsInView] = useState(
    () =>
      typeof window !== "undefined" &&
      typeof IntersectionObserver === "undefined"
  );

  useEffect(() => {
    const node = ref.current;

    if (!node || typeof IntersectionObserver === "undefined") {
      return undefined;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);

        if (once) {
          observer.disconnect();
        }
      } else if (!once) {
        setIsInView(false);
      }
    }, observerOptions);

    observer.observe(node);

    return () => observer.disconnect();
  }, [observerOptions, once]);

  return {
    ref,
    isInView,
  };
}
