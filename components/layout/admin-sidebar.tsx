"use client";

import { useLocale, useTranslations } from "next-intl";
import { DashboardNavItem } from "@/components/layout/dashboard-nav-item";

function Icon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

/**
 * TASK-1901 (minimal) — Admin dashboard nav. Only the `overview` and
 * `education` segments have real pages so far; the rest of
 * `phase-19-admin-dashboard.md` (teachers/students/payments/settings
 * management) is still Not Started and intentionally left off this list
 * rather than linking to pages that don't exist yet.
 */
const NAV_ITEMS = [
  {
    segment: "dashboard",
    labelKey: "overview",
    icon: <Icon path="M4 4h7v7H4zM13 4h7v4h-7zM13 11h7v9h-7zM4 14h7v6H4z" />,
  },
  {
    segment: "education",
    labelKey: "education",
    icon: (
      <Icon path="M3 8.5 12 4l9 4.5-9 4.5-9-4.5ZM7 10.7v4.8c0 1.4 2.2 3 5 3s5-1.6 5-3v-4.8" />
    ),
  },
] as const;

export function AdminSidebar() {
  const t = useTranslations("adminDashboard.nav");
  const locale = useLocale();

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="border-b border-border px-6 py-6">
        <p className="text-2xl font-bold text-primary">{t("brand")}</p>
        <p className="mt-1 text-xs font-medium text-foreground/50">{t("subtitle")}</p>
      </div>

      <nav aria-label={t("landmark")} className="flex flex-1 flex-col gap-1 px-4 py-5">
        {NAV_ITEMS.map((item) => (
          <DashboardNavItem
            key={item.segment}
            href={`/${locale}/admin/${item.segment}`}
            label={t(item.labelKey)}
            icon={item.icon}
          />
        ))}
      </nav>
    </div>
  );
}
