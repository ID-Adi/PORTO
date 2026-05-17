"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import { createContext, useContext, useLayoutEffect, useRef, useState } from "react";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  setTheme: Dispatch<SetStateAction<Theme>>;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeProviderProps = {
  children: ReactNode;
};

function disableTransitionsBriefly() {
  const style = document.createElement("style");
  style.setAttribute("data-disable-transitions", "true");
  style.appendChild(
    document.createTextNode(
      "*,*::before,*::after{transition:none!important;animation:none!important}",
    ),
  );
  document.head.appendChild(style);
  // Force a reflow so the rule applies before the theme class flips.
  void document.body.offsetHeight;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      style.remove();
    });
  });
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>("light");
  const isFirstRunRef = useRef(true);

  useLayoutEffect(() => {
    const root = document.documentElement;

    if (!isFirstRunRef.current) {
      disableTransitionsBriefly();
    }
    isFirstRunRef.current = false;

    root.classList.toggle("dark", theme === "dark");
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
  }, [theme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggle: () => {
          setTheme((currentTheme) =>
            currentTheme === "dark" ? "light" : "dark"
          );
        },
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider.");
  }

  return context;
}
