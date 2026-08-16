import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  label?: string;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, id, error, label, hint, disabled, required, rows = 3, ...props }, ref) => {
    const generatedId = React.useId();
    const textareaId = id ?? generatedId;
    const errorId = error ? `${textareaId}-error` : undefined;
    const hintId = hint ? `${textareaId}-hint` : undefined;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={textareaId} className="text-sm font-medium text-foreground text-start">
            {label}
            {required && (
              <span className="text-error" aria-hidden="true">
                {" "}*
              </span>
            )}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          disabled={disabled}
          required={required}
          aria-invalid={!!error || undefined}
          aria-describedby={cn(errorId, hintId).split(" ").filter(Boolean).join(" ") || undefined}
          className={cn(
            "rounded-2xl border bg-surface px-4 py-2.5 text-sm text-foreground text-start placeholder:text-foreground/50",
            "border-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            error && "border-error focus-visible:ring-error",
            disabled && "opacity-50 pointer-events-none",
            className
          )}
          {...props}
        />
        {hint && !error && (
          <p id={hintId} className="text-xs text-foreground/60 text-start">{hint}</p>
        )}
        {error && (
          <p id={errorId} role="alert" className="text-xs text-error text-start">{error}</p>
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";
