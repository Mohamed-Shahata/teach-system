/**
 * Verifies the token pairs from docs/design-system/colors.md meet WCAG AA
 * contrast (>=4.5:1 for normal text, >=3:1 for large text / UI components),
 * for both light and dark values. Run with `npm run check-contrast`.
 *
 * This checks the token *values* directly (kept in sync with
 * app/[locale]/globals.css by hand, since Tailwind v4 tokens are CSS, not a
 * JS-importable config) rather than parsing CSS, to keep this a small,
 * dependency-free script per the "don't overengineer" coding rule.
 */

type ThemeTokens = Record<string, string>;

const light: ThemeTokens = {
  background: "#F7F8FA",
  foreground: "#111827",
  surface: "#FFFFFF",
  "surface-muted": "#F1F3F6",
  primary: "#1E4FD8",
  "primary-foreground": "#FFFFFF",
  secondary: "#0F9E8E",
  "secondary-foreground": "#111827",
  success: "#16A34A",
  warning: "#C86D05",
  error: "#DC2626",
  info: "#2563EB",
};

const dark: ThemeTokens = {
  background: "#1B1C1E",
  foreground: "#E8E9EA",
  surface: "#232427",
  "surface-muted": "#2B2C2F",
  primary: "#A1A1AA",
  "primary-foreground": "#1B1C1E",
  secondary: "#3FCBB8",
  "secondary-foreground": "#04211C",
  success: "#4ADE80",
  warning: "#FBBF24",
  error: "#F87171",
  info: "#60A5FA",
};

/** [foreground token, background token, minimum ratio, note] */
type Pair = [string, string, number, string];

const NORMAL_TEXT_MIN = 4.5;
const LARGE_TEXT_MIN = 3;

const pairs: Pair[] = [
  ["foreground", "background", NORMAL_TEXT_MIN, "body text on page background"],
  ["foreground", "surface", NORMAL_TEXT_MIN, "body text on cards/panels"],
  ["foreground", "surface-muted", NORMAL_TEXT_MIN, "body text on muted panels"],
  ["primary-foreground", "primary", NORMAL_TEXT_MIN, "text/icons on primary buttons"],
  ["secondary-foreground", "secondary", NORMAL_TEXT_MIN, "text/icons on secondary buttons"],
  ["primary", "background", LARGE_TEXT_MIN, "primary as link/UI element on background"],
  ["success", "background", LARGE_TEXT_MIN, "success text/icon on background"],
  ["warning", "background", LARGE_TEXT_MIN, "warning text/icon on background"],
  ["error", "background", LARGE_TEXT_MIN, "error text/icon on background"],
  ["info", "background", LARGE_TEXT_MIN, "info text/icon on background"],
];

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return [r, g, b];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const channel = (value: number) => {
    const srgb = value / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  };
  const [rl, gl, bl] = [channel(r), channel(g), channel(b)];
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexToRgb(hexA));
  const lumB = relativeLuminance(hexToRgb(hexB));
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

function checkTheme(name: string, tokens: ThemeTokens): boolean {
  console.log(`\n${name}:`);
  let allPass = true;

  for (const [fg, bg, min, note] of pairs) {
    const fgHex = tokens[fg];
    const bgHex = tokens[bg];
    if (!fgHex || !bgHex) {
      console.log(`  ⚠ skipped ${fg} / ${bg} — token missing`);
      continue;
    }
    const ratio = contrastRatio(fgHex, bgHex);
    const pass = ratio >= min;
    allPass = allPass && pass;
    const status = pass ? "✓" : "✗";
    console.log(
      `  ${status} ${fg} on ${bg} (${note}): ${ratio.toFixed(2)}:1 (min ${min}:1)`,
    );
  }

  return allPass;
}

const lightPass = checkTheme("Light theme", light);
const darkPass = checkTheme("Dark theme", dark);

if (!lightPass || !darkPass) {
  console.error("\nContrast check FAILED — see ✗ entries above.");
  process.exit(1);
}

console.log("\nAll token pairs meet WCAG AA contrast.");
