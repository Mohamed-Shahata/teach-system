"use client";
import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}

export function Dialog({ open, onOpenChange, title, description, children, footer }: DialogProps) {
  const titleId = React.useId();
  const descId = React.useId();

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-foreground/40"
        aria-hidden="true"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className="relative z-10 w-full max-w-md rounded-lg border border-border bg-surface p-4 text-start shadow-lg"
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <h2 id={titleId} className="text-base font-semibold text-foreground">{title}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
            className={cn(
              "ms-auto rounded-md p-1 text-foreground/60 hover:bg-surface-muted",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            )}
          >
            ✕
          </button>
        </div>
        {description && <p id={descId} className="mb-3 text-sm text-foreground/60">{description}</p>}
        <div className="text-sm text-foreground">{children}</div>
        {footer && <div className="mt-4 flex items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
