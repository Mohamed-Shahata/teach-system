"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { DashboardTopbar } from "@/components/layout/dashboard-topbar";

export interface DashboardShellProps {
  /** Sidebar nav content — e.g. `<TeacherSidebar />` or a future `<AdminSidebar />`. */
  sidebar: React.ReactNode;
  displayName: string;
  children: React.ReactNode;
}

/**
 * Shared dashboard chrome: a fixed sidebar (always visible at `lg`+, an
 * off-canvas drawer below that) plus a sticky top bar. Generic over the
 * sidebar content so both the teacher dashboard (TASK-701) and the future
 * admin dashboard (`docs/tasks/phase-19-admin-dashboard.md`, TASK-1901)
 * reuse this instead of duplicating the shell.
 */
export function DashboardShell({ sidebar, displayName, children }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 shrink-0 border-e border-border bg-surface lg:block">
        {sidebar}
      </aside>

      {/* Mobile off-canvas sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-20 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/30"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside
            className={cn(
              "absolute inset-y-0 start-0 w-64 border-e border-border bg-surface shadow-2xl"
            )}
          >
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-h-screen flex-col lg:ms-64">
        <DashboardTopbar displayName={displayName} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 bg-background p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
