import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  options: SelectOption[];
  label?: string;
  error?: string;
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, id, options, label, error, placeholder, disabled, required, ...props }, ref) => {
    const generatedId = React.useId();
    const selectId = id ?? generatedId;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-foreground text-start">
            {label}
            {required && (
              <span className="text-error" aria-hidden="true">
                {" "}*
              </span>
            )}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            required={required}
            aria-invalid={!!error || undefined}
            className={cn(
              "h-10 w-full appearance-none rounded-full border bg-surface ps-4 pe-9 text-sm text-foreground text-start",
              "border-input transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              "hover:border-primary/50",
              error && "border-error focus-visible:ring-error",
              disabled && "opacity-50 pointer-events-none",
              className
            )}
            {...props}
          >
            {placeholder && <option value="" disabled hidden>{placeholder}</option>}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50"
          >
            <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        {error && <p role="alert" className="text-xs text-error text-start">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";
