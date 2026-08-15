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
  ({ className, id, options, label, error, placeholder, disabled, ...props }, ref) => {
    const selectId = id ?? React.useId();
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-foreground text-start">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          aria-invalid={!!error || undefined}
          className={cn(
            "h-10 rounded-full border bg-surface ps-4 pe-8 text-sm text-foreground text-start",
            "border-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
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
        {error && <p role="alert" className="text-xs text-error text-start">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";
