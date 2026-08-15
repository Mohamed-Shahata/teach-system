import * as React from "react";
import { cn } from "@/lib/utils/cn";

export type BadgeVariant = "neutral" | "success" | "warning" | "error" | "info";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  icon?: React.ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "bg-surface-muted text-foreground border-border",
  success: "bg-success/10 text-success border-success/30",
  warning: "bg-warning/10 text-warning border-warning/30",
  error: "bg-error/10 text-error border-error/30",
  info: "bg-info/10 text-info border-info/30",
};

/** Badge never relies on color alone — pass an icon or descriptive text. */
export function Badge({ className, variant = "neutral", icon, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {icon && <span className="shrink-0" aria-hidden="true">{icon}</span>}
      {children}
    </span>
  );
}
