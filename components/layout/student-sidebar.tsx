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
    labelKey: "overview",
    icon: (
      <Icon path="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z" />
    ),
  },
  {
    segment: "courses",
    labelKey: "myCourses",
    icon: (
      <Icon path="M12 6.5c-1.5-1-4-1.5-6-1.2v12.5c2 -.3 4.5.2 6 1.2 1.5-1 4-1.5 6-1.2V5.3c-2-.3-4.5.2-6 1.2zM12 6.5v12" />
    ),
  },
  {
    segment: "exams",
    labelKey: "exams",
    icon: (
      <Icon path="M9 3.5h6l3 3v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1ZM9 12h6M9 15.5h6M9 8.5h3" />
    ),
  },
  {
    segment: "teachers",
    labelKey: "teachers",
    icon: (
      <Icon path="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20a7.5 7.5 0 0 1 15 0" />
    ),
  },
  {
    segment: "schedule",
    labelKey: "schedule",
    icon: (
      <Icon path="M7 3.5v3M17 3.5v3M4 8.5h16M5.5 6h13a1.5 1.5 0 0 1 1.5 1.5v11a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6ZM8 12.5h2M8 15.5h2M14 12.5h2M14 15.5h2" />
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
 * TASK-1103/TASK-1005/TASK-2104/TASK-2302/TASK-3202/TASK-3203/TASK-3205 —
 * student sidebar. "Dashboard" (notifications, invoices, enrollment
 * history — TASK-1103's original page), "My courses" (TASK-3202's
 * dedicated active-enrollments-with-progress list, separate from the
 * dashboard), "Exams" (standalone stage-wide exams, TASK-2104),
 * "Teachers" (TASK-2302, renamed from "My teachers" by TASK-3203 — now
 * the full directory with a "My Teachers" tab), "Schedule" (TASK-3205 —
 * weekly timetable derived from subscribed teachers' slots), and
 * "Settings" (TASK-1005); the
 * `student/courses/[courseId]/lessons|quizzes/*` player views
 * (folder-structure.md) are reached by navigating from a course card,
 * not a top-level nav item.
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
