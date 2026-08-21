"use client";
import * as React from "react";
import { MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface TableAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "destructive";
  disabled?: boolean;
}

export interface TableActionsMenuProps {
  actions: TableAction[];
  /** Accessible label for the trigger button. Defaults to "Actions". */
  triggerLabel?: string;
  className?: string;
}

export type MenuNavDirection = "next" | "prev" | "first" | "last";

/**
 * Pure index math for ArrowUp/ArrowDown/Home/End navigation over a menu
 * that may contain disabled items. Exported (and separately unit-tested)
 * so the keyboard-nav logic has real coverage even though this repo has
 * no jsdom/testing-library setup to render the component itself (same
 * constraint noted in prior UI tasks, e.g. TASK-3102).
 *
 * @param enabledIndices - indices of non-disabled actions, in order
 * @param activeIndex - currently focused action index, or -1 if none
 * @returns the next active index, or null if there are no enabled actions
 */
export function nextActiveIndex(
  enabledIndices: number[],
  activeIndex: number,
  direction: MenuNavDirection,
): number | null {
  if (enabledIndices.length === 0) return null;
  const currentPos = enabledIndices.indexOf(activeIndex);
  let nextPos: number;
  if (direction === "first") nextPos = 0;
  else if (direction === "last") nextPos = enabledIndices.length - 1;
  else if (direction === "next")
    nextPos = currentPos === -1 ? 0 : (currentPos + 1) % enabledIndices.length;
  else
    nextPos =
      currentPos === -1
        ? enabledIndices.length - 1
        : (currentPos - 1 + enabledIndices.length) % enabledIndices.length;
  return enabledIndices[nextPos];
}

/**
 * Single "..." trigger that opens a dropdown of row actions. Replaces
 * one-off groups of standalone icon buttons in table rows (edit/delete/
 * view/confirm/reject/...) with one consistent, keyboard-accessible
 * control. See docs/design-system/components.md — "Table row actions".
 */
export function TableActionsMenu({
  actions,
  triggerLabel = "Actions",
  className,
}: TableActionsMenuProps) {
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const itemRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  const enabledIndices = React.useMemo(
    () => actions.map((a, i) => (a.disabled ? -1 : i)).filter((i) => i !== -1),
    [actions],
  );

  const close = React.useCallback((focusTrigger: boolean) => {
    setOpen(false);
    setActiveIndex(-1);
    if (focusTrigger) triggerRef.current?.focus();
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        close(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open, close]);

  React.useEffect(() => {
    if (open && activeIndex >= 0) {
      itemRefs.current[activeIndex]?.focus();
    }
  }, [open, activeIndex]);

  const moveTo = (direction: MenuNavDirection) => {
    const next = nextActiveIndex(enabledIndices, activeIndex, direction);
    if (next !== null) setActiveIndex(next);
  };

  const onTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
      moveTo("first");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      moveTo("last");
    }
  };

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        moveTo("next");
        break;
      case "ArrowUp":
        e.preventDefault();
        moveTo("prev");
        break;
      case "Home":
        e.preventDefault();
        moveTo("first");
        break;
      case "End":
        e.preventDefault();
        moveTo("last");
        break;
      case "Escape":
        e.preventDefault();
        close(true);
        break;
      case "Tab":
        close(false);
        break;
    }
  };

  return (
    <div className={cn("relative inline-block text-start", className)} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={triggerLabel}
        onClick={() => (open ? close(false) : (setOpen(true), moveTo("first")))}
        onKeyDown={onTriggerKeyDown}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-full text-foreground",
          "hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
      >
        <MoreVertical className="h-4 w-4" aria-hidden="true" />
      </button>
      {open && (
        <div
          role="menu"
          aria-label={triggerLabel}
          onKeyDown={onMenuKeyDown}
          className="absolute inset-s-0 z-20 mt-1 min-w-40 rounded-md border border-border bg-surface py-1 shadow-lg"
        >
          {actions.map((action, i) => (
            <button
              key={i}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              role="menuitem"
              type="button"
              tabIndex={-1}
              disabled={action.disabled}
              onClick={() => {
                if (action.disabled) return;
                action.onClick();
                close(true);
              }}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-start text-sm",
                "focus-visible:outline-none bg-surface hover:bg-surface-muted focus-visible:bg-surface-muted",
                action.variant === "destructive" ? "text-error" : "text-foreground",
                action.disabled && "opacity-50 pointer-events-none",
              )}
            >
              {action.icon && (
                <span className="shrink-0" aria-hidden="true">
                  {action.icon}
                </span>
              )}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
