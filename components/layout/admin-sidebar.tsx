"use client";

import { useLocale, useTranslations } from "next-intl";
import { DashboardNavItem } from "@/components/layout/dashboard-nav-item";
import { useSidebarCollapse } from "@/components/layout/sidebar-context";
import { LogoMark } from "@/components/brand/logo-mark";
import { cn } from "@/lib/utils/cn";

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
 * TASK-1901 — Admin dashboard layout & nav. All six sections from
 * `features/admin-dashboard.md` now route somewhere real: Overview and
 * Education Setup have their full implementation (TASK-1902, TASK-1905);
 * Teachers/Students/Payments/Settings land as `common.comingSoon`
 * placeholders here until their own tasks (TASK-1903, TASK-1904,
 * TASK-1906, TASK-1907) are picked up, same pattern as the old
 * `teacher/exams` placeholder before Phase 12 landed.
 */
const NAV_ITEMS = [
  {
    segment: "dashboard",
    labelKey: "overview",
    icon: <Icon path="M4 4h7v7H4zM13 4h7v4h-7zM13 11h7v9h-7zM4 14h7v6H4z" />,
  },
  {
    segment: "analytics",
    labelKey: "analytics",
    icon: <Icon path="M4 19V5M4 19h16M8 15v-4M12 15V9M16 15v-7" />,
  },
  {
    segment: "teachers",
    labelKey: "teachers",
    icon: (
      <Icon path="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 20c0-3.5 3.6-6 8-6s8 2.5 8 6" />
    ),
  },
  {
    segment: "students",
    labelKey: "students",
    icon: (
      <Icon path="M3 8.5 12 4l9 4.5-9 4.5-9-4.5ZM6 10.3v4.4c0 1.7 2.7 3.5 6 3.5s6-1.8 6-3.5v-4.4" />
    ),
  },
  {
    segment: "education",
    labelKey: "education",
    icon: (
      <Icon path="M3 8.5 12 4l9 4.5-9 4.5-9-4.5ZM7 10.7v4.8c0 1.4 2.2 3 5 3s5-1.6 5-3v-4.8" />
    ),
  },
  {
    segment: "payments",
    labelKey: "payments",
    icon: (
      <Icon path="M3 7h18v10H3zM3 10h18M7 15h4" />
    ),
  },
  {
    segment: "settings",
    labelKey: "settings",
    icon: (
      <Icon path="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4.5 12a7.5 7.5 0 0 1 .1-1.2L3 9.3l1.5-2.6 2 .6c.5-.5 1.1-.9 1.7-1.2l.3-2.1h3l.3 2.1c.6.3 1.2.7 1.7 1.2l2-.6L17 6.7l-1.6 1.5c.1.4.1.8.1 1.2s0 .8-.1 1.2L17 12.1l-1.5 2.6-2-.6c-.5.5-1.1.9-1.7 1.2l-.3 2.1h-3l-.3-2.1a6.5 6.5 0 0 1-1.7-1.2l-2 .6L3 12.5l1.6-1.5c0-.4-.1-.8-.1-1.2Z" />
    ),
  },
] as const;

export function AdminSidebar() {
  const t = useTranslations("adminDashboard.nav");
  const locale = useLocale();
  const { collapsed } = useSidebarCollapse();

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className={cn("flex items-center gap-3 border-b border-border px-6 py-5", collapsed && "justify-center px-3")}>
        <LogoMark className="h-9 w-9 shrink-0" />
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-foreground">{t("brand")}</p>
            <p className="truncate text-xs font-medium text-foreground/50">{t("subtitle")}</p>
          </div>
        )}
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
