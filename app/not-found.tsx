import Link from "next/link";
import "./[locale]/globals.css";

/**
 * Root `not-found.tsx`.
 *
 * `app/[locale]/not-found.tsx` only fires for `notFound()` calls made
 * *inside* an already-matched `[locale]/...` route tree. A URL that
 * doesn't match any route pattern at all (e.g. `/en/teacher/dashboard/d`,
 * where only `/en/teacher/dashboard` exists) never resolves into that
 * tree in the first place, so Next.js falls back to this root boundary
 * instead. Even though there's no `app/layout.tsx`, Next still auto-wraps
 * every route (including this one) in a default `<html>/<body>` — unlike
 * `global-error.tsx`, which replaces the root layout and therefore must
 * supply its own. Rendering `<html>/<body>` here too would nest a second
 * pair inside that default wrapper and cause a hydration mismatch, so
 * this only returns the page content and imports the design tokens
 * directly so it still looks like the app.
 */
export default function RootNotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-6 py-16">
      <div className="flex flex-col items-center gap-7 text-center">
        <svg viewBox="0 0 320 220" className="h-56 w-80" aria-hidden="true">
          <ellipse cx="160" cy="198" rx="120" ry="10" fill="var(--color-border)" opacity="0.6" />

          {/* Floating dashed path */}
          <path
            d="M30 130 Q90 90 150 120 T290 100"
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="2"
            strokeDasharray="6 8"
            strokeLinecap="round"
          />

          {/* Compass / lost-map circle */}
          <circle cx="160" cy="108" r="66" fill="var(--color-surface)" stroke="var(--color-border)" strokeWidth="2" />
          <circle cx="160" cy="108" r="52" fill="var(--color-surface-muted)" />

          {/* Compass needle */}
          <g transform="translate(160 108) rotate(-25)">
            <path d="M0 -34 L9 6 L0 0 L-9 6 Z" fill="var(--color-primary)" />
            <path d="M0 34 L9 -6 L0 0 L-9 -6 Z" fill="var(--color-border)" />
          </g>
          <circle cx="160" cy="108" r="6" fill="var(--color-surface)" stroke="var(--color-primary)" strokeWidth="2" />

          {/* 404 badge */}
          <g transform="translate(160 190)">
            <rect x="-46" y="-16" width="92" height="32" rx="16" fill="var(--color-primary)" />
            <text x="0" y="6" textAnchor="middle" fill="var(--color-primary-foreground)" style={{ fontSize: 18, fontWeight: 700 }}>
              404
            </text>
          </g>

          {/* Little dotted "you are here" pin, off to the side */}
          <g transform="translate(248 66)">
            <path
              d="M0 0c9 0 16 7 16 16 0 11-16 26-16 26S-16 27-16 16C-16 7-9 0 0 0Z"
              fill="var(--color-error)"
              opacity="0.85"
            />
            <circle cx="0" cy="15" r="5" fill="var(--color-surface)" />
          </g>
        </svg>

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-foreground">Page not found</h1>
          <p className="max-w-sm text-sm leading-6 text-foreground/60">
            We couldn&apos;t find the page you&apos;re looking for. It may have moved, or the link might be
            outdated.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
