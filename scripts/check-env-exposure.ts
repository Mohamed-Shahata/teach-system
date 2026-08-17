/**
 * TASK-1502 (Phase 15) — fails if a non-`NEXT_PUBLIC_` environment
 * variable is referenced from client-bundled code. Next.js only inlines
 * `process.env.X` into the client bundle for code that's actually
 * reachable from the client — in this codebase that's exactly two
 * places, by convention:
 *
 *   1. Any file with a `"use client"` directive (a Client Component).
 *   2. Any file under `lib/client/` — this project's own naming
 *      convention (see `docs/architecture/overview.md`) for
 *      browser-only helper modules (Firebase client SDK init,
 *      Cloudinary URL builders, etc.) that Client Components import.
 *
 * Server-only modules protect themselves from being pulled into either
 * of those by importing `"server-only"` (see `lib/server/firebaseAdmin
 * .ts`'s own comment) — a real build-time guard, not something this
 * script needs to re-check. This script's job is the *env var* half of
 * that safety net: catching a private var referenced directly from
 * client-reachable code before it ever gets that far.
 *
 * `NODE_ENV` is exempt — Next.js/webpack always inlines it safely
 * regardless of the `NEXT_PUBLIC_` prefix, same as every other
 * Next.js app.
 *
 * Run with `npm run check-env-exposure` (wired into CI alongside
 * check-translations/check-rtl/check-contrast).
 */
import { readdirSync, readFileSync, statSync } from "fs";
import { join, sep } from "path";

const CLIENT_DIRS = ["app", "components", "lib"];
const ROOT = join(__dirname, "..");

const ENV_REFERENCE = /process\.env\.([A-Z0-9_]+)/g;
const EXEMPT_VARS = new Set(["NODE_ENV"]);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) return walk(full);
    if (/\.(tsx?|jsx?)$/.test(entry) && !entry.endsWith(".test.ts") && !entry.endsWith(".test.tsx")) {
      return [full];
    }
    return [];
  });
}

/** A file is client-reachable if it's a Client Component (`"use client"`) or lives under `lib/client/`. */
function isClientReachable(file: string, content: string): boolean {
  if (file.includes(`${sep}lib${sep}client${sep}`)) {
    return true;
  }
  const firstNonEmptyLines = content.split("\n").slice(0, 5).join("\n");
  return /["']use client["'];?/.test(firstNonEmptyLines);
}

let violations = 0;

for (const dir of CLIENT_DIRS) {
  const dirPath = join(ROOT, dir);
  let files: string[];
  try {
    files = walk(dirPath);
  } catch {
    continue;
  }

  for (const file of files) {
    const content = readFileSync(file, "utf-8");
    if (!isClientReachable(file, content)) continue;

    const lines = content.split("\n");
    lines.forEach((line, i) => {
      for (const match of line.matchAll(ENV_REFERENCE)) {
        const varName = match[1];
        if (varName.startsWith("NEXT_PUBLIC_") || EXEMPT_VARS.has(varName)) continue;
        console.error(
          `${file}:${i + 1}: client-reachable code references "process.env.${varName}" — ` +
            `only NEXT_PUBLIC_* vars may be read here.`,
        );
        violations++;
      }
    });
  }
}

if (violations > 0) {
  console.error(`\n${violations} env-exposure violation(s) found.`);
  process.exit(1);
} else {
  console.log("Env-exposure guard OK — no private env vars referenced from client-bundled code.");
}
