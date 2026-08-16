"use client";

import Link from "next/link";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { BrandMark } from "@/components/landing/brand-mark";

export function LandingHeader({
  brandTitle,
  signInLabel,
  locale,
  navHomeLabel,
  navFeaturesLabel,
  dashboardLabel,
  dashboardHref,
}: {
  brandTitle: string;
  signInLabel: string;
  locale: string;
  navHomeLabel: string;
  navFeaturesLabel: string;
  /** Present only for a signed-in visitor — swaps the sign-in CTA for a dashboard link. */
  dashboardLabel?: string;
  dashboardHref?: string;
}) {
  const isAuthenticated = Boolean(dashboardHref);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link href={`/${locale}`} className="flex min-w-0 items-center gap-3">
          <BrandMark />
          <span className="truncate text-base font-semibold text-foreground">{brandTitle}</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
          <Link href={`/${locale}`} className="text-sm font-medium text-foreground/70 transition-colors hover:text-foreground">
            {navHomeLabel}
          </Link>
          <a
            href="#features"
            className="text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
          >
            {navFeaturesLabel}
          </a>
        </nav>

        <div className="flex shrink-0 items-center gap-1">
          <LocaleSwitcher />
          <ThemeToggle />
          <Link
            href={isAuthenticated ? dashboardHref! : `/${locale}/login`}
            className="ms-2 inline-flex h-10 items-center justify-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.03] hover:opacity-90 active:scale-[0.98]"
          >
            {isAuthenticated ? dashboardLabel : signInLabel}
          </Link>
        </div>
      </div>
    </header>
  );
}
