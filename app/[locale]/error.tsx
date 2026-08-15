"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

/**
 * Route-level error boundary for everything under `/[locale]/*`. Next.js
 * requires this to be a client component; it receives the thrown error
 * plus a `reset()` to retry rendering the segment.
 */
export default function LocaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errors");

  useEffect(() => {
    // Surface to whatever error monitoring is wired up server-side; the
    // digest lets you correlate this client render with server logs.
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-screen place-items-center bg-background px-6 py-12">
      <div className="flex flex-col items-center gap-6 text-center">
        <svg viewBox="0 0 240 160" className="h-40 w-56" aria-hidden="true">
          <ellipse cx="120" cy="146" rx="90" ry="8" className="fill-border" />
          <circle cx="120" cy="76" r="52" className="fill-error/10" />
          <line x1="98" y1="60" x2="142" y2="96" className="stroke-error" strokeWidth="6" strokeLinecap="round" />
          <line x1="142" y1="60" x2="98" y2="96" className="stroke-error" strokeWidth="6" strokeLinecap="round" />
        </svg>

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-foreground">{t("unexpected")}</h1>
          {error.digest && <p className="text-xs text-foreground/40">{error.digest}</p>}
        </div>

        <button
          type="button"
          onClick={reset}
          className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          {t("tryAgain")}
        </button>
      </div>
    </div>
  );
}
