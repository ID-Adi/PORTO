"use client";

import { useEffect, useState } from "react";

type RailLine = {
  top: number;
};

const SELECTORS = [
  ".profile-hero-mark",
  ".profile-section",
  ".profile-divider",
  ".profile-mini-divider",
  ".profile-bleed-top",
  ".profile-bleed-bottom",
];

function collectRailLines(root: HTMLElement): RailLine[] {
  const rootRect = root.getBoundingClientRect();
  const positions = new Set<number>();

  for (const selector of SELECTORS) {
    const elements = root.querySelectorAll<HTMLElement>(selector);

    elements.forEach((element) => {
      const rect = element.getBoundingClientRect();

      if (selector === ".profile-bleed-top") {
        positions.add(Math.round(rect.top - rootRect.top));
        return;
      }

      if (selector === ".profile-bleed-bottom") {
        positions.add(Math.round(rect.bottom - rootRect.top));
        return;
      }

      positions.add(Math.round(rect.top - rootRect.top));
      positions.add(Math.round(rect.bottom - rootRect.top));
    });
  }

  return [...positions]
    .sort((a, b) => a - b)
    .filter((value, index, array) => index === 0 || value - array[index - 1] > 1)
    .map((top) => ({ top }));
}

export function ContentRails() {
  const [lines, setLines] = useState<RailLine[]>([]);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-site-shell-root]");
    if (!root) return;

    let frame = 0;

    const measure = () => {
      cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        setLines(collectRailLines(root));
      });
    };

    measure();

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(root);
    root.querySelectorAll<HTMLElement>(SELECTORS.join(",")).forEach((element) => {
      resizeObserver.observe(element);
    });

    const mutationObserver = new MutationObserver(measure);
    mutationObserver.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });

    window.addEventListener("resize", measure);
    window.addEventListener("load", measure);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("load", measure);
    };
  }, []);

  return (
    <div aria-hidden="true" className="content-rails">
      {lines.map((line) => (
        <span
          key={line.top}
          className="content-rails__line"
          style={{ top: `${line.top}px` }}
        />
      ))}
    </div>
  );
}
