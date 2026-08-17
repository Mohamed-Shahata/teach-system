/**
 * Human-readable file size, e.g. `formatBytes(2_400_000)` -> "2.3 MB".
 * Extracted from `components/lesson/lesson-file-manager.tsx` (TASK-1303)
 * so the standalone teacher files page (TASK-1304) doesn't duplicate it.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
