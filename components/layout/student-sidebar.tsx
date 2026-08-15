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

const NAV_ITEMS = [
  {
    segment: "dashboard",
    labelKey: "myCourses",
    icon: (
      <Icon path="M12 6.5c-1.5-1-4-1.5-6-1.2v12.5c2 -.3 4.5.2 6 1.2 1.5-1 4-1.5 6-1.2V5.3c-2-.3-4.5.2-6 1.2zM12 6.5v12" />
    ),
  },
] as const;

/**
 * TASK-1103 — student sidebar. Only "My courses" for now; the future
 * `student/courses/[courseId]/*` lesson/quiz views (folder-structure.md)
 * are reached by navigating from a course card, not a top-level nav item.
 */
export function StudentSidebar() {
  const t = useTranslations("studentDashboard.nav");
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
            href={`/${locale}/student/${item.segment}`}
            label={t(item.labelKey)}
            icon={item.icon}
          />
        ))}
      </nav>
    </div>
  );
}
