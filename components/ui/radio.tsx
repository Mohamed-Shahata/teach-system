import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ className, id, label, disabled, ...props }, ref) => {
    const radioId = id ?? React.useId();
    return (
      <div className="inline-flex items-center">
        <input
          ref={ref}
          type="radio"
          id={radioId}
          disabled={disabled}
          className={cn(
            "h-4 w-4 border-input text-primary accent-primary",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            disabled && "opacity-50 pointer-events-none",
            className
          )}
          {...props}
        />
        {label && (
          <label htmlFor={radioId} className="ms-2 text-sm text-foreground select-none">
            {label}
          </label>
        )}
      </div>
    );
  }
);
Radio.displayName = "Radio";
