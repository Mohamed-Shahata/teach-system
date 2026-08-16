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
  /** "md" (default) is the compact single-column width; "lg" gives two-column forms room to breathe. */
  size?: "md" | "lg";
}

const SIZE_CLASS: Record<"md" | "lg", string> = {
  md: "max-w-md",
  lg: "max-w-2xl",
};

export function Dialog({ open, onOpenChange, title, description, children, footer, size = "md" }: DialogProps) {
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
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        aria-hidden="true"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className={cn(
          "animate-fade-up relative z-10 flex max-h-[85vh] w-full flex-col rounded-3xl border border-border bg-surface p-6 text-start shadow-2xl shadow-foreground/10",
          SIZE_CLASS[size]
        )}
      >
        <div className="mb-4 flex shrink-0 items-start justify-between gap-2">
          <h2 id={titleId} className="text-lg font-semibold text-foreground">{title}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
            className={cn(
              "ms-auto grid h-8 w-8 shrink-0 place-items-center rounded-full text-foreground/60 transition-colors hover:bg-surface-muted hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            )}
          >
            ✕
          </button>
        </div>
        {description && <p id={descId} className="mb-4 shrink-0 text-sm text-foreground/60">{description}</p>}
        <div className="themed-scrollbar min-h-0 flex-1 overflow-y-auto text-sm text-foreground">{children}</div>
        {footer && <div className="mt-6 flex shrink-0 items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
