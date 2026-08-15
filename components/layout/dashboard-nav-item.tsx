"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

export interface DashboardNavItemProps {
  href: string;
  label: string;
  icon: ReactNode;
}

/**
 * Single sidebar link. "Active" is matched by exact path or by the item's
 * href being a leading segment of the current path (so `/teacher/courses`
 * stays highlighted on `/teacher/courses/abc123`).
 */
export function DashboardNavItem({ href, label, icon }: DashboardNavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary/8 text-primary"
          : "text-foreground/70 hover:bg-surface-muted hover:text-foreground"
      )}
    >
      {isActive && <span className="absolute inset-y-2 start-0 w-0.5 rounded-full bg-primary" aria-hidden="true" />}
      <span className="grid h-5 w-5 shrink-0 place-items-center text-current" aria-hidden="true">
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
}
