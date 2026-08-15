export const THEME_COOKIE_NAME = "theme";

export type Theme = "light" | "dark";

/** Parses a raw cookie value into a valid `Theme`, or `null` if absent/invalid. */
export function parseTheme(value: string | undefined | null): Theme | null {
  return value === "light" || value === "dark" ? value : null;
}
