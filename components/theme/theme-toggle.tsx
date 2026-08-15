"use client";

import { useTheme } from "@/components/theme/theme-provider";

// TODO(TASK-204 - Core UI primitives): restyle using the shared `Button`
// primitive once it exists; this is intentionally minimal/unstyled for now.
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(nextTheme)}
      aria-label={`Switch to ${nextTheme} theme`}
      className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground"
    >
      {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
    </button>
  );
}
