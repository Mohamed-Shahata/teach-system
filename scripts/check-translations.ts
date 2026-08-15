/**
 * TASK-302: fails if messages/en.json and messages/ar.json keys diverge.
 * Run via `npm run check-translations` (also wired into CI).
 */
import en from "../messages/en.json" with { type: "json" };
import ar from "../messages/ar.json" with { type: "json" };

function flattenKeys(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([key, value]) =>
    flattenKeys(value, prefix ? `${prefix}.${key}` : key)
  );
}

const enKeys = new Set(flattenKeys(en));
const arKeys = new Set(flattenKeys(ar));

const missingInAr = [...enKeys].filter((k) => !arKeys.has(k));
const missingInEn = [...arKeys].filter((k) => !enKeys.has(k));

if (missingInAr.length || missingInEn.length) {
  if (missingInAr.length) {
    console.error("Missing in messages/ar.json:\n" + missingInAr.map((k) => `  - ${k}`).join("\n"));
  }
  if (missingInEn.length) {
    console.error("Missing in messages/en.json:\n" + missingInEn.map((k) => `  - ${k}`).join("\n"));
  }
  process.exit(1);
}

console.log(`Translation parity OK — ${enKeys.size} keys in sync.`);
