import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";

/** Empty state — optional call to action. */
export interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, actionLabel, onAction, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-8 text-center">
      {icon && <span className="text-foreground/40" aria-hidden="true">{icon}</span>}
      <p className="font-medium text-foreground">{title}</p>
      {description && <p className="text-sm text-foreground/60">{description}</p>}
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction} className="mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

/** Inline spinner. */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn("inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent text-primary", className)}
    />
  );
}

/** Full-page loading state. */
export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 p-12">
      <Spinner />
      <p className="text-sm text-foreground/60">{label}</p>
    </div>
  );
}

/** Full-page / error-boundary error state. */
export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({ title = "Something went wrong", description, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-error/30 bg-error/5 p-8 text-center">
      <p className="font-medium text-error">{title}</p>
      {description && <p className="text-sm text-foreground/60">{description}</p>}
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry} className="mt-2">
          Try again
        </Button>
      )}
    </div>
  );
}

/** Inline error message (form/section-level, not full page). */
export function InlineError({ message }: { message: string }) {
  return (
    <p role="alert" className="text-sm text-error text-start">
      {message}
    </p>
  );
}
