"use client";

import * as React from "react";

interface SidebarCollapseContextValue {
  /** True only for the persistent desktop (`lg:`+) sidebar — the mobile drawer is never collapsed, only open/closed. */
  collapsed: boolean;
  toggle: () => void;
}

const SidebarCollapseContext = React.createContext<SidebarCollapseContextValue>({
  collapsed: false,
  toggle: () => {},
});

export function SidebarCollapseProvider({
  collapsed,
  toggle,
  children,
}: SidebarCollapseContextValue & { children: React.ReactNode }) {
  const value = React.useMemo(() => ({ collapsed, toggle }), [collapsed, toggle]);
  return <SidebarCollapseContext.Provider value={value}>{children}</SidebarCollapseContext.Provider>;
}

/** Read the persistent-sidebar collapsed state. Always `false` inside the mobile drawer (it doesn't collapse, it opens/closes). */
export function useSidebarCollapse(): SidebarCollapseContextValue {
  return React.useContext(SidebarCollapseContext);
}
