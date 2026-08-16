"use client";

import Link from "next/link";
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
    icon: <Icon path="M4 4h7v7H4zM13 4h7v4h-7zM13 11h7v9h-7zM4 14h7v6H4z" />,
  },
  {
    segment: "courses",
    labelKey: "courses",
    icon: (
      <Icon path="M12 6.5c-1.5-1-4-1.5-6-1.2v12.5c2 -.3 4.5.2 6 1.2 1.5-1 4-1.5 6-1.2V5.3c-2-.3-4.5.2-6 1.2zM12 6.5v12" />
    ),
  },
  {
    segment: "students",
    labelKey: "students",
    icon: <Icon path="M2 8.5 12 4l10 4.5-10 4.5-10-4.5ZM6 10.7v4.8c0 1.4 2.7 3 6 3s6-1.6 6-3v-4.8M20 9v6.5" />,
  },
  {
    segment: "exams",
    labelKey: "exams",
    icon: (
      <Icon path="M9 4h6a1 1 0 0 1 1 1v1h1a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h1V5a1 1 0 0 1 1-1ZM9 12h6M9 16h4" />
    ),
  },
  {
    segment: "files",
    labelKey: "files",
    icon: <Icon path="M4 6.5A1.5 1.5 0 0 1 5.5 5H10l2 2.5h6.5A1.5 1.5 0 0 1 20 9v9.5A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5Z" />,
  },
  {
    segment: "settings",
    labelKey: "settings",
    icon: (
      <Icon path="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM19.4 12a7.4 7.4 0 0 0-.14-1.42l2.03-1.58-2-3.46-2.39.96a7.5 7.5 0 0 0-1.23-.71L15.3 3.2h-4l-.37 2.59a7.5 7.5 0 0 0-1.23.71l-2.39-.96-2 3.46 2.03 1.58a7.4 7.4 0 0 0 0 2.84L5.3 15l2 3.46 2.39-.96c.38.28.79.51 1.23.71l.37 2.59h4l.37-2.59a7.5 7.5 0 0 0 1.23-.71l2.39.96 2-3.46-2.03-1.58c.09-.46.14-.94.14-1.42Z" />
    ),
  },
] as const;

export function TeacherSidebar() {
  const t = useTranslations("teacherDashboard.nav");
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
            href={`/${locale}/teacher/${item.segment}`}
            label={t(item.labelKey)}
            icon={item.icon}
          />
        ))}
      </nav>

      <div className={cn("border-t border-border p-5", collapsed && "p-3")}>
        <Link
          href={`/${locale}/teacher/courses`}
          title={collapsed ? t("createCourse") : undefined}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <span aria-hidden="true">+</span>
          {!collapsed && <span>{t("createCourse")}</span>}
        </Link>
      </div>
    </div>
  );
}
