/** Minimal className combiner (no external deps). Falsy values are skipped. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
