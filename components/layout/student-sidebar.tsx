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

const NAV_ITEMS = [
  {
    segment: "dashboard",
    labelKey: "myCourses",
    icon: (
      <Icon path="M12 6.5c-1.5-1-4-1.5-6-1.2v12.5c2 -.3 4.5.2 6 1.2 1.5-1 4-1.5 6-1.2V5.3c-2-.3-4.5.2-6 1.2zM12 6.5v12" />
    ),
  },
  {
    segment: "settings",
    labelKey: "settings",
    icon: (
      <Icon path="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4.5 12.7v-1.4l1.9-.5.6-1.5-1-1.7 1-1 1.7 1 1.5-.6.5-1.9h1.4l.5 1.9 1.5.6 1.7-1 1 1-1 1.7.6 1.5 1.9.5v1.4l-1.9.5-.6 1.5 1 1.7-1 1-1.7-1-1.5.6-.5 1.9h-1.4l-.5-1.9-1.5-.6-1.7 1-1-1 1-1.7-.6-1.5-1.9-.5Z" />
    ),
  },
] as const;

/**
 * TASK-1103/TASK-1005 — student sidebar. "My courses" plus "Settings"
 * (TASK-1005); the future `student/courses/[courseId]/*` lesson/quiz
 * views (folder-structure.md) are reached by navigating from a course
 * card, not a top-level nav item.
 */
export function StudentSidebar() {
  const t = useTranslations("studentDashboard.nav");
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
            href={`/${locale}/student/${item.segment}`}
            label={t(item.labelKey)}
            icon={item.icon}
          />
        ))}
      </nav>
    </div>
  );
}
