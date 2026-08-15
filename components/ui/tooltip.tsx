"use client";
import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface TooltipProps {
  content: string;
  children: React.ReactElement<{ "aria-describedby"?: string }>;
  side?: "top" | "bottom";
}

export function Tooltip({ content, children, side = "top" }: TooltipProps) {
  const [visible, setVisible] = React.useState(false);
  const id = React.useId();

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {React.cloneElement(children, { "aria-describedby": id })}
      {visible && (
        <span
          id={id}
          role="tooltip"
          className={cn(
            "absolute start-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background rtl:translate-x-1/2",
            side === "top" ? "bottom-full mb-1" : "top-full mt-1"
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}
