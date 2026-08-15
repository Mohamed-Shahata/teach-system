"use client";
import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface TabItem {
  value: string;
  label: string;
  content: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  defaultValue?: string;
}

export function Tabs({ tabs, defaultValue }: TabsProps) {
  const [active, setActive] = React.useState(defaultValue ?? tabs[0]?.value);

  return (
    <div>
      <div role="tablist" className="flex gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            role="tab"
            aria-selected={active === tab.value}
            onClick={() => setActive(tab.value)}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium -mb-px",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              active === tab.value
                ? "border-primary text-primary"
                : "border-transparent text-foreground/60 hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) =>
        tab.value === active ? (
          <div key={tab.value} role="tabpanel" className="pt-3 text-start">
            {tab.content}
          </div>
        ) : null
      )}
    </div>
  );
}
