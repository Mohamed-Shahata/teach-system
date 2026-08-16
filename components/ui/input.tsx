import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, id, error, label, hint, disabled, required, type, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const errorId = error ? `${inputId}-error` : undefined;
    const hintId = hint ? `${inputId}-hint` : undefined;
    const isPassword = type === "password";
    const [revealPassword, setRevealPassword] = React.useState(false);

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-foreground text-start">
            {label}
            {required && (
              <span className="text-error" aria-hidden="true">
                {" "}*
              </span>
            )}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            required={required}
            type={isPassword ? (revealPassword ? "text" : "password") : type}
            aria-invalid={!!error || undefined}
            aria-describedby={cn(errorId, hintId).split(" ").filter(Boolean).join(" ") || undefined}
            className={cn(
              "h-10 w-full rounded-full border bg-surface px-4 text-sm text-foreground text-start placeholder:text-foreground/50",
              "border-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              error && "border-error focus-visible:ring-error",
              disabled && "opacity-50 pointer-events-none",
              isPassword && "pe-11",
              className
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setRevealPassword((prev) => !prev)}
              disabled={disabled}
              aria-label={revealPassword ? "Hide password" : "Show password"}
              aria-pressed={revealPassword}
              tabIndex={-1}
              className="absolute end-3 top-1/2 grid -translate-y-1/2 place-items-center text-foreground/50 hover:text-foreground disabled:pointer-events-none"
            >
              {revealPassword ? (
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                  <path
                    d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M6.6 6.7C4.5 8.1 3 10 2 12c1.8 3.9 5.7 7 10 7 1.6 0 3.1-.4 4.5-1.1M9.9 4.2A10.7 10.7 0 0 1 12 4c4.3 0 8.2 3.1 10 7-.6 1.3-1.4 2.5-2.4 3.6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                  <path
                    d="M2 12c1.8-3.9 5.7-7 10-7s8.2 3.1 10 7c-1.8 3.9-5.7 7-10 7s-8.2-3.1-10-7Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="12" r="2.7" fill="none" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              )}
            </button>
          )}
        </div>
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
