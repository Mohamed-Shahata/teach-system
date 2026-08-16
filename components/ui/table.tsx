import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  numeric?: boolean;
}

export interface TableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  rowActions?: (row: T) => React.ReactNode;
  /** Header label for the trailing row-actions column. Defaults to "Actions" -- pass a localized string. */
  actionsLabel?: string;
}

export function Table<T>({
  columns,
  rows,
  rowKey,
  loading,
  emptyMessage = "No data",
  rowActions,
  actionsLabel = "Actions",
}: TableProps<T>) {
  return (
    <div className="themed-scrollbar overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-max border-collapse text-start text-sm">
        <thead className="bg-surface-muted">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn(
                  "whitespace-nowrap px-4 py-3 text-start align-middle font-medium text-foreground",
                  col.numeric && "text-end"
                )}
              >
                {col.header}
              </th>
            ))}
            {rowActions && (
              <th scope="col" className="whitespace-nowrap px-4 py-3 text-end align-middle font-medium text-foreground">
                {actionsLabel}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length + (rowActions ? 1 : 0)} className="px-4 py-6 text-center text-foreground/60">
                Loading…
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (rowActions ? 1 : 0)} className="px-4 py-6 text-center text-foreground/60">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)} className="border-t border-border">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "whitespace-nowrap px-4 py-3 text-start align-middle text-foreground",
                      col.numeric && "text-end tabular-nums"
                    )}
                  >
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
                {rowActions && <td className="whitespace-nowrap px-4 py-3 text-end align-middle">{rowActions(row)}</td>}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
