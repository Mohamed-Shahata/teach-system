/**
 * TASK-303: flags physical Tailwind properties (ml-, mr-, left-, right-,
 * pl-, pr-, text-left, text-right, rounded-l-, rounded-r-, border-l-,
 * border-r-) inside components/** in favor of logical equivalents
 * (ms-/me-, start-/end-, ps-/pe-, text-start/text-end, rounded-s-/rounded-e-,
 * border-s-/border-e-), per docs/internationalization/rtl-ltr.md.
 *
 * Run via `npm run check-rtl` (also wired into CI).
 */
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

const TARGET_DIR = join(__dirname, "..", "components");

// Order matters: longer/more specific patterns first so error messages
// suggest the closest logical replacement.
const PHYSICAL_PATTERNS: { pattern: RegExp; suggestion: string }[] = [
  { pattern: /\bml-\S+/g, suggestion: "ms-" },
  { pattern: /\bmr-\S+/g, suggestion: "me-" },
  { pattern: /\bpl-\S+/g, suggestion: "ps-" },
  { pattern: /\bpr-\S+/g, suggestion: "pe-" },
  { pattern: /\bleft-\S+/g, suggestion: "start-" },
  { pattern: /\bright-\S+/g, suggestion: "end-" },
  { pattern: /\btext-left\b/g, suggestion: "text-start" },
  { pattern: /\btext-right\b/g, suggestion: "text-end" },
  { pattern: /\brounded-l-\S+/g, suggestion: "rounded-s-" },
  { pattern: /\brounded-r-\S+/g, suggestion: "rounded-e-" },
  { pattern: /\bborder-l-\S+/g, suggestion: "border-s-" },
  { pattern: /\bborder-r-\S+/g, suggestion: "border-e-" },
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) return walk(full);
    if (/\.(tsx?|jsx?)$/.test(entry)) return [full];
    return [];
  });
}

let violations = 0;

for (const file of walk(TARGET_DIR)) {
  const content = readFileSync(file, "utf-8");
  const lines = content.split("\n");
  lines.forEach((line, i) => {
    for (const { pattern, suggestion } of PHYSICAL_PATTERNS) {
      const matches = line.match(pattern);
      if (matches) {
        for (const match of matches) {
          console.error(`${file}:${i + 1}: physical class "${match}" — use "${suggestion}*" instead`);
          violations++;
        }
      }
    }
  });
}

if (violations > 0) {
  console.error(`\n${violations} physical RTL/LTR class(es) found in components/**.`);
  process.exit(1);
}

console.log("RTL/LTR audit OK — no physical classes found in components/**.");
