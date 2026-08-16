"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { BrandMark } from "@/components/landing/brand-mark";

interface NavItem {
  id: string;
  label: string;
}

export function LandingHeader({
  brandTitle,
  signInLabel,
  locale,
  navHomeLabel,
  navFeaturesLabel,
  navShowcaseLabel,
  navHowItWorksLabel,
  navCoursesLabel,
  navTeachersLabel,
  navTestimonialsLabel,
  navFaqLabel,
  dashboardLabel,
  dashboardHref,
}: {
  brandTitle: string;
  signInLabel: string;
  locale: string;
  navHomeLabel: string;
  navFeaturesLabel: string;
  navShowcaseLabel: string;
  navHowItWorksLabel: string;
  navCoursesLabel: string;
  navTeachersLabel: string;
  navTestimonialsLabel: string;
  navFaqLabel: string;
  /** Present only for a signed-in visitor — swaps the sign-in CTA for a dashboard link. */
  dashboardLabel?: string;
  dashboardHref?: string;
}) {
  const isAuthenticated = Boolean(dashboardHref);

  const navItems: NavItem[] = [
    { id: "hero", label: navHomeLabel },
    { id: "features", label: navFeaturesLabel },
    { id: "showcase", label: navShowcaseLabel },
    { id: "how-it-works", label: navHowItWorksLabel },
    { id: "courses", label: navCoursesLabel },
    { id: "teachers", label: navTeachersLabel },
    { id: "testimonials", label: navTestimonialsLabel },
    { id: "faq", label: navFaqLabel },
  ];

  const [activeId, setActiveId] = useState<string>("hero");
  const [menuOpen, setMenuOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const sections = navItems
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);

    if (sections.length === 0) return;

    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    sections.forEach((section) => observerRef.current?.observe(section));
    return () => observerRef.current?.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <a href="#hero" className="flex min-w-0 items-center gap-3">
          <BrandMark />
          <span className="truncate text-base font-semibold text-foreground">{brandTitle}</span>
        </a>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {navItems.map((item) => {
            const isActive = activeId === item.id;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                aria-current={isActive ? "true" : undefined}
                className={`relative px-3 py-2 text-sm font-medium transition-colors after:absolute after:bottom-0 after:start-3 after:end-3 after:h-0.5 after:origin-center after:rounded-full after:bg-primary after:transition-transform after:duration-300 after:content-[''] ${
                  isActive
                    ? "text-foreground after:scale-x-100"
                    : "text-foreground/70 after:scale-x-0 hover:text-foreground"
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-1">
          <LocaleSwitcher />
          <ThemeToggle />
          <Link
            href={isAuthenticated ? dashboardHref! : `/${locale}/login`}
            className="ms-2 hidden h-10 items-center justify-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.03] hover:opacity-90 active:scale-[0.98] sm:inline-flex"
          >
            {isAuthenticated ? dashboardLabel : signInLabel}
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label="Toggle navigation menu"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground/70 transition-colors hover:bg-surface-muted hover:text-foreground lg:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              {menuOpen ? (
                <path
                  d="M6 6l12 12M18 6 6 18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      <div
        className={`grid overflow-hidden border-t border-border/60 transition-[grid-template-rows,opacity] duration-300 ease-out lg:hidden ${
          menuOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <nav className="min-h-0 flex flex-col gap-1 px-6 py-3" aria-label="Primary mobile">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={() => setMenuOpen(false)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                activeId === item.id
                  ? "bg-accent text-primary"
                  : "text-foreground/70 hover:bg-surface-muted hover:text-foreground"
              }`}
            >
              {item.label}
            </a>
          ))}
          <Link
            href={isAuthenticated ? dashboardHref! : `/${locale}/login`}
            onClick={() => setMenuOpen(false)}
            className="mt-2 inline-flex h-10 items-center justify-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground sm:hidden"
          >
            {isAuthenticated ? dashboardLabel : signInLabel}
          </Link>
        </nav>
      </div>
    </header>
  );
}
