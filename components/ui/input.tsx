import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, id, error, label, hint, disabled, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const errorId = error ? `${inputId}-error` : undefined;
    const hintId = hint ? `${inputId}-hint` : undefined;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-foreground text-start">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={!!error || undefined}
          aria-describedby={cn(errorId, hintId).split(" ").filter(Boolean).join(" ") || undefined}
          className={cn(
            "h-10 rounded-full border bg-surface px-4 text-sm text-foreground text-start placeholder:text-foreground/50",
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
Input.displayName = "Input";
