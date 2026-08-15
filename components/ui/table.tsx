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
}

export function Table<T>({ columns, rows, rowKey, loading, emptyMessage = "No data", rowActions }: TableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-start text-sm">
        <thead className="bg-surface-muted">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn("px-3 py-2 font-medium text-foreground text-start", col.numeric && "text-end")}
              >
                {col.header}
              </th>
            ))}
            {rowActions && <th className="px-3 py-2 text-end" />}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length + (rowActions ? 1 : 0)} className="px-3 py-6 text-center text-foreground/60">
                Loading…
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (rowActions ? 1 : 0)} className="px-3 py-6 text-center text-foreground/60">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)} className="border-t border-border">
                {columns.map((col) => (
                  <td key={col.key} className={cn("px-3 py-2 text-foreground", col.numeric && "text-end tabular-nums")}>
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
                {rowActions && <td className="px-3 py-2 text-end">{rowActions(row)}</td>}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
