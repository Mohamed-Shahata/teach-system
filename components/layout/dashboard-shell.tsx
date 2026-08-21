"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { DashboardTopbar } from "@/components/layout/dashboard-topbar";
import { SidebarCollapseProvider } from "@/components/layout/sidebar-context";

export interface DashboardShellProps {
  /** Sidebar nav content -- e.g. `<TeacherSidebar />` or a future `<AdminSidebar />`. */
  sidebar: React.ReactNode;
  displayName: string;
  children: React.ReactNode;
  /** Topbar title override -- pass the role-specific dashboard name (e.g. "Admin Dashboard") so it doesn't default to "Teacher Dashboard". */
  topbarTitle?: string;
  /** Profile avatar (Cloudinary URL) -- shown in the topbar instead of initials when present. */
  avatarUrl?: string;
  /** TASK-2004 — unread notification count, forwarded to `DashboardTopbar`. Omit to hide the bell entirely. */
  unreadCount?: number;
}

const EXPANDED_WIDTH = "w-64";
const COLLAPSED_WIDTH = "w-20";

/**
 * Shared dashboard chrome: a floating, collapsible sidebar (always visible
 * at `lg`+, an off-canvas drawer below that) plus a sticky top bar. Generic
 * over the sidebar content so both the teacher dashboard (TASK-701) and the
 * admin dashboard (`docs/tasks/phase-19-admin-dashboard.md`, TASK-1901)
 * reuse this instead of duplicating the shell.
 *
 * The desktop sidebar floats off the viewport edges (`inset-y-4 start-4`,
 * rounded corners, shadow) rather than sitting flush against the screen,
 * and can be collapsed to an icon rail via `SidebarCollapseProvider` --
 * see `dashboard-nav-item.tsx` for how nav links react to that.
 */
export function DashboardShell({ sidebar, displayName, children, topbarTitle, avatarUrl, unreadCount }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);
  const toggleCollapsed = React.useCallback(() => setCollapsed((v) => !v), []);

  const desktopWidth = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar -- floats off the edges instead of sitting flush against them. */}
      <aside
        className={cn(
          "fixed inset-y-4 start-4 z-30 hidden shrink-0 overflow-hidden rounded-3xl border border-border bg-surface shadow-lg shadow-foreground/5 transition-[width] duration-200 ease-in-out lg:block",
          desktopWidth
        )}
      >
        <SidebarCollapseProvider collapsed={collapsed} toggle={toggleCollapsed}>
          <div className="flex h-full flex-col">
            <div className="flex-1 overflow-y-auto overflow-x-hidden">{sidebar}</div>

            {/* Collapse/expand toggle, pinned to the sidebar's own bottom edge. */}
            <div className="shrink-0 border-t border-border p-3">
              <button
                type="button"
                onClick={toggleCollapsed}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                className={cn(
                  "flex h-9 w-full items-center gap-2 rounded-xl text-foreground/60 transition-colors hover:bg-surface-muted hover:text-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  collapsed ? "justify-center" : "justify-start px-3"
                )}
              >
                <svg
                  viewBox="0 0 24 24"
                  className={cn("h-4 w-4 shrink-0 transition-transform duration-200", collapsed && "rotate-180")}
                  aria-hidden="true"
                >
                  <path
                    d="M15 5 8 12l7 7"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                {!collapsed && <span className="text-xs font-medium">Collapse</span>}
              </button>
            </div>
          </div>
        </SidebarCollapseProvider>
      </aside>

      {/* Mobile off-canvas sidebar -- above the top bar (z-40 > topbar's z-20), also floated off the edges.
          Always mounted (not conditionally rendered) so the open/close transitions actually animate --
          `mobileOpen` only toggles opacity/transform/pointer-events, it doesn't mount/unmount the node. */}
      <div
        className={cn(
          "fixed inset-0 z-40 lg:hidden",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
        aria-hidden={!mobileOpen}
      >
        <div
          className={cn(
            "absolute inset-0 bg-foreground/30 transition-opacity duration-300 ease-in-out",
            mobileOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
        <aside
          className={cn(
            "absolute inset-y-4 start-4 w-64 overflow-hidden rounded-3xl border border-border bg-surface shadow-2xl",
            "transition-transform duration-300 ease-out",
            mobileOpen ? "translate-x-0" : "-translate-x-[calc(100%+2rem)] rtl:translate-x-[calc(100%+2rem)]"
          )}
        >
          <SidebarCollapseProvider collapsed={false} toggle={() => {}}>
            {sidebar}
          </SidebarCollapseProvider>
        </aside>
      </div>

      <div className={cn("flex min-h-screen flex-col transition-[margin] duration-200 ease-in-out", collapsed ? "lg:ms-28" : "lg:ms-72")}>
        <DashboardTopbar
          displayName={displayName}
          avatarUrl={avatarUrl}
          onMenuClick={() => setMobileOpen(true)}
          title={topbarTitle}
          unreadCount={unreadCount}
        />
        <main className="flex-1 bg-background p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
