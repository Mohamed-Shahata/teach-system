import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  return (
    <nav className="flex items-center justify-center gap-2" aria-label="Pagination">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Previous page"
        className={cn(
          "rounded-md border border-border px-2 py-1 text-sm rtl:rotate-180",
          "disabled:opacity-40 disabled:pointer-events-none hover:bg-surface-muted",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        )}
      >
        ‹
      </button>
      <span className="text-sm text-foreground tabular-nums">
        {page} / {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Next page"
        className={cn(
          "rounded-md border border-border px-2 py-1 text-sm rtl:rotate-180",
          "disabled:opacity-40 disabled:pointer-events-none hover:bg-surface-muted",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        )}
      >
        ›
      </button>
    </nav>
  );
}
