"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { LogoutButton } from "@/components/auth/logout-button";
import { Button } from "@/components/ui/button";

/** Derives `/{locale}/{role}/settings` from the current path's `(protected)/{role}/...` segment. */
function useSettingsHref(): string {
  const locale = useLocale();
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  // segments[0] is the locale; segments[1] is the role ("admin" | "teacher" | "student").
  const role = segments[1] ?? "teacher";
  return `/${locale}/${role}/settings`;
}

export interface DashboardTopbarProps {
  displayName: string;
  onMenuClick: () => void;
  /** Overrides the default ("Teacher Dashboard") title -- pass this from role-specific layouts (admin, student) so the topbar doesn't always say "Teacher". */
  title?: string;
  /** Profile avatar (Cloudinary URL) -- shown instead of the initials badge when present. */
  avatarUrl?: string;
}

/**
 * Sticky top bar shown on every `(protected)/*` dashboard page. The menu
 * button only renders visibly on small screens (`lg:hidden`) — the
 * sidebar itself is always visible at `lg` and up, per
 * `docs/design-system/theming.md` breakpoint conventions.
 *
 * Background matches the page background (not `--color-surface`) so it
 * blends into its parent instead of reading as a separate panel.
 */
export function DashboardTopbar({ displayName, onMenuClick, title, avatarUrl }: DashboardTopbarProps) {
  const t = useTranslations("teacherDashboard");
  const settingsHref = useSettingsHref();

  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex min-h-16 items-center gap-3 px-4 sm:px-6">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
          aria-label={t("openMenu")}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
            <path
              d="M4 7h16M4 12h16M4 17h16"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="2"
            />
          </svg>
        </Button>

        <span className="hidden min-w-44 text-xl font-bold text-primary md:inline">
          {title ?? t("topbarTitle")}
        </span>

        <div className="hidden flex-1 items-center gap-3 md:flex">
          <label className="flex max-w-md flex-1 items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground/60 focus-within:ring-2 focus-within:ring-primary">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0">
              <path
                d="M10.5 4.5a6 6 0 1 1 3.9 10.57l4.26 4.26-1.06 1.06-4.26-4.26A6 6 0 0 1 10.5 4.5Z"
                fill="currentColor"
              />
            </svg>
            <input
              type="search"
              aria-label={t("searchLabel")}
              placeholder={t("searchPlaceholder")}
              className="w-full truncate bg-transparent text-foreground outline-none placeholder:text-foreground/60"
            />
          </label>
          <span className="text-sm text-foreground/60">{t("greeting", { name: displayName })}</span>
        </div>

        <div className="ms-auto flex items-center gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
          <span className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden="true" />
          <Link
            href={settingsHref}
            aria-label={t("nav.settings")}
            className="cursor-pointer rounded-full transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- Cloudinary-hosted, remote avatar; no local optimization needed here.
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-8 w-8 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary"
                aria-hidden="true"
              >
                {displayName
                  .trim()
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((part) => part[0]?.toUpperCase())
                  .join("") || "?"}
              </span>
            )}
          </Link>
          <LogoutButton size="sm" />
        </div>
      </div>
    </header>
  );
}
