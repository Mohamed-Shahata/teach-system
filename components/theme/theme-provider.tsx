"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { THEME_COOKIE_NAME, type Theme } from "@/lib/theme";

const THEME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  /**
   * The theme resolved server-side from the `theme` cookie. `null` means no
   * explicit choice has been made yet — the page was already painted
   * correctly via the `prefers-color-scheme` CSS fallback (see
   * app/[locale]/globals.css), so no `data-theme` attribute was rendered.
   */
  initialTheme: Theme | null;
  children: ReactNode;
}

export function ThemeProvider({ initialTheme, children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(initialTheme ?? "light");

  // No explicit cookie yet: read the system preference once, client-side
  // only, purely to drive the toggle control's initial icon/label. This
  // never touches the DOM `data-theme` attribute or the cookie — those stay
  // "unset" (system-driven via CSS) until the user makes an explicit choice,
  // per theming.md ("system default is only the initial value").
  useEffect(() => {
    if (initialTheme) return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    // Subscribing to an external system (the OS color-scheme preference) and
    // syncing it into state is exactly the documented exception to
    // "no setState in effects" — this isn't derived from props/state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(mediaQuery.matches ? "dark" : "light");
    const handleChange = (event: MediaQueryListEvent) => {
      setThemeState(event.matches ? "dark" : "light");
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [initialTheme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    document.documentElement.setAttribute("data-theme", next);
    document.cookie = `${THEME_COOKIE_NAME}=${next}; Max-Age=${THEME_COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`;
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
