import "server-only";

/**
 * Minimal in-memory TTL cache (TASK-3602) for read-heavy, slow-changing
 * data — chosen over `unstable_cache`/an edge cache per
 * `docs/architecture/performance-audit.md`'s recommendation: this
 * project's Vercel free-tier deployment doesn't have a shared edge KV,
 * and a per-instance in-memory cache is enough to cut repeat reads of
 * near-static reference data (`subjects`, `educationStages`) within a
 * single warm serverless instance without adding infra.
 *
 * Not a general-purpose cache — just get/set-with-TTL/invalidate over a
 * `Map`, scoped to one process. A cold start (new instance) always
 * misses, which is fine: the data this is used for changes rarely and
 * reads are cheap relative to Firestore's per-request cost.
 */
export function createMemoryCache<T>(ttlMs: number) {
  let entry: { value: T; expiresAt: number } | null = null;

  return {
    /** Returns the cached value if present and unexpired, otherwise `null`. */
    get(): T | null {
      if (!entry || entry.expiresAt < Date.now()) return null;
      return entry.value;
    },
    set(value: T): void {
      entry = { value, expiresAt: Date.now() + ttlMs };
    },
    /** Called on any write to the underlying data so stale reads can't outlive an edit. */
    invalidate(): void {
      entry = null;
    },
  };
}
