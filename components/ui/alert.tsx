import * as React from "react";
import { cn } from "@/lib/utils/cn";

export type AlertVariant = "info" | "success" | "warning" | "error";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  icon?: React.ReactNode;
  title?: string;
}

const variantClasses: Record<AlertVariant, string> = {
  info: "border-info/30 bg-info/10 text-info",
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  error: "border-error/30 bg-error/10 text-error",
};

export function Alert({ className, variant = "info", icon, title, children, ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn("flex gap-2 rounded-md border p-3 text-start text-sm", variantClasses[variant], className)}
      {...props}
    >
      {icon && <span className="shrink-0" aria-hidden="true">{icon}</span>}
      <div className="flex flex-col gap-0.5">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className="text-foreground/80">{children}</div>}
      </div>
    </div>
  );
}
