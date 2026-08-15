"use client";
import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  id?: string;
}

export function Switch({ checked, onCheckedChange, disabled, label, id }: SwitchProps) {
  const generatedId = React.useId();
  const switchId = id ?? generatedId;
  return (
    <div className="inline-flex items-center">
      <button
        type="button"
        id={switchId}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          checked ? "bg-primary" : "bg-surface-muted border border-border",
          disabled && "opacity-50 pointer-events-none"
        )}
      >
        <span
          className={cn(
            "block h-5 w-5 rounded-full bg-surface shadow transition-transform rtl:-translate-x-0",
            checked ? "translate-x-5 rtl:-translate-x-5" : "translate-x-0.5 rtl:-translate-x-0.5"
          )}
        />
      </button>
      {label && (
        <label htmlFor={switchId} className="ms-2 text-sm text-foreground select-none">
          {label}
        </label>
      )}
    </div>
  );
}
