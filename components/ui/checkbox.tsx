import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, id, label, disabled, ...props }, ref) => {
    const checkboxId = id ?? React.useId();
    return (
      <div className="inline-flex items-center">
        <input
          ref={ref}
          type="checkbox"
          id={checkboxId}
          disabled={disabled}
          className={cn(
            "h-4 w-4 rounded border-input text-primary accent-primary",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            disabled && "opacity-50 pointer-events-none",
            className
          )}
          {...props}
        />
        {label && (
          <label htmlFor={checkboxId} className="ms-2 text-sm text-foreground select-none">
            {label}
          </label>
        )}
      </div>
    );
  }
);
Checkbox.displayName = "Checkbox";
