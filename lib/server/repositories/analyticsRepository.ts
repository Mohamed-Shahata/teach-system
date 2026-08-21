import "server-only";
import { adminDb } from "@/lib/server/firebaseAdmin";

/**
 * Repository for the admin Analytics page (Phase 4). Unlike
 * `systemStatsRepository` (a single denormalized "current totals" doc,
 * incremented in place by feature services as events happen), the charts
 * here need a **time series** — revenue and new-subscription counts per
 * calendar month — which nothing denormalizes today. Rather than add more
 * counters to increment at every call site, this reads `subscriptions`
 * and `subscriptionInvoices` directly and buckets them by month in
 * memory: it's an Admin-only, low-traffic page, so a live scan is the
 * simpler and more honest source of truth than a second set of counters
 * that could drift from Phase 2/3's actual records.
 */
export interface MonthlyPoint {
  /** Bucket key — shape depends on the requesting `AnalyticsRange.granularity`: `YYYY-MM-DD` (month), `YYYY-MM` (year), or `YYYY` (5year). */
  period: string;
  value: number;
}

/** `id` is a teacherId/subjectId/stageId — the service layer joins it to a display name. */
export interface RankedCount {
  id: string;
  count: number;
}

const SUBSCRIPTIONS_COLLECTION = "subscriptions";
const INVOICES_COLLECTION = "subscriptionInvoices";
const PAYMENTS_COLLECTION = "payments";
const ENROLLMENTS_COLLECTION = "enrollments";
const COURSES_COLLECTION = "courses";

/** Payment statuses that represent settled, real revenue (TASK-1104's state machine: manual `confirmed`, gateway `succeeded`). */
const CONFIRMED_PAYMENT_STATUSES = ["succeeded", "confirmed"] as const;

/**
 * TASK-3304 — the three preset granularities the Analytics page's single
 * filter control switches between. `month` drills into daily buckets for
 * the anchor month, `year` buckets by calendar month across the anchor
 * year, `5year` buckets by calendar year across the trailing 5 years.
 */
export type AnalyticsGranularity = "month" | "year" | "5year";

/**
 * A resolved time window: `[since, until)` in epoch ms, plus the ordered
 * bucket keys every chart/breakdown for this request should report
 * against (so a bucket with zero records still appears, e.g. a month with
 * no revenue). Built once per request via `buildRange` and threaded
 * through every query below, so every chart/breakdown on the Analytics
 * page reads from the exact same window (TASK-3304's acceptance
 * criterion).
 */
export interface AnalyticsRange {
  granularity: AnalyticsGranularity;
  since: number;
  until: number;
  bucketKeys: string[];
}

/** Builds the resolved window + bucket keys for a granularity, anchored at `anchor` (defaults to now). */
export function buildRange(granularity: AnalyticsGranularity, anchor: Date = new Date()): AnalyticsRange {
  const y = anchor.getUTCFullYear();
  const m = anchor.getUTCMonth();

  if (granularity === "month") {
    const since = Date.UTC(y, m, 1);
    const until = Date.UTC(y, m + 1, 1);
    const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const bucketKeys = Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(Date.UTC(y, m, i + 1));
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    });
    return { granularity, since, until, bucketKeys };
  }

  if (granularity === "year") {
    const since = Date.UTC(y, 0, 1);
    const until = Date.UTC(y + 1, 0, 1);
    const bucketKeys = Array.from({ length: 12 }, (_, i) => `${y}-${String(i + 1).padStart(2, "0")}`);
    return { granularity, since, until, bucketKeys };
  }

  // 5year: the anchor year plus the 4 preceding it.
  const startYear = y - 4;
  const since = Date.UTC(startYear, 0, 1);
  const until = Date.UTC(y + 1, 0, 1);
  const bucketKeys = Array.from({ length: 5 }, (_, i) => String(startYear + i));
  return { granularity, since, until, bucketKeys };
}

/** Maps a timestamp to its bucket key for a given granularity — the inverse of `buildRange`'s key format. */
function periodOf(timestampMs: number, granularity: AnalyticsGranularity): string {
  const d = new Date(timestampMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  if (granularity === "month") return `${y}-${m}-${String(d.getUTCDate()).padStart(2, "0")}`;
  if (granularity === "year") return `${y}-${m}`;
  return String(y);
}

/**
 * Maps a `subscriptionInvoices` billing `period` (`YYYY-MM`) to the bucket
 * key for a given granularity. `year` buckets match a period exactly;
 * `5year` buckets by the period's year; `month` (daily buckets within one
 * calendar month) has no day-level billing data to bucket by, so a
 * period's whole amount lands on that month's first day — the closest
 * honest placement without inventing a day the invoice doesn't carry.
 */
function invoiceBucketKey(period: string, granularity: AnalyticsGranularity): string {
  if (granularity === "year") return period;
  if (granularity === "5year") return period.slice(0, 4);
  return `${period}-01`;
}

export const analyticsRepository = {
  /**
   * Revenue bucketed per `range.bucketKeys` (TASK-3304 — granularity-aware;
   * previously always monthly) — combines both payment models (TASK-3302):
   * `confirmed` subscription invoices' `amount` (bucketed by the invoice's
   * own `period` field via `invoiceBucketKey`, not `createdAt`, so a late
   * confirmation still counts toward the period it billed for) plus
   * one-off course `payments` in a terminal successful status
   * (`succeeded`/`confirmed` — see `paymentService`'s state machine),
   * bucketed by `createdAt` since a payment has no separate billing
   * period of its own.
   */
  async monthlyRevenue(range: AnalyticsRange): Promise<MonthlyPoint[]> {
    const periodSince = periodOf(range.since, "year"); // `YYYY-MM` lower bound, valid across all granularities

    const [invoiceSnap, paymentSnap] = await Promise.all([
      adminDb.collection(INVOICES_COLLECTION).where("status", "==", "confirmed").where("period", ">=", periodSince).get(),
      adminDb
        .collection(PAYMENTS_COLLECTION)
        .where("status", "in", [...CONFIRMED_PAYMENT_STATUSES])
        .where("createdAt", ">=", range.since)
        .get(),
    ]);

    const totals = new Map<string, number>(range.bucketKeys.map((k) => [k, 0]));
    for (const doc of invoiceSnap.docs) {
      const data = doc.data();
      const bucket = invoiceBucketKey(String(data.period), range.granularity);
      if (!totals.has(bucket)) continue;
      totals.set(bucket, (totals.get(bucket) ?? 0) + Number(data.amount ?? 0));
    }
    for (const doc of paymentSnap.docs) {
      const data = doc.data();
      const bucket = periodOf(Number(data.createdAt), range.granularity);
      if (!totals.has(bucket)) continue;
      totals.set(bucket, (totals.get(bucket) ?? 0) + Number(data.amount ?? 0));
    }
    return range.bucketKeys.map((period) => ({ period, value: totals.get(period) ?? 0 }));
  },

  /**
   * New active subscriptions created, bucketed per `range.bucketKeys`
   * (TASK-3304) — the "subscription growth" chart. Bucketed by
   * `createdAt`, since a subscription (unlike an invoice) has no separate
   * billing period of its own.
   */
  async monthlySubscriptionGrowth(range: AnalyticsRange): Promise<MonthlyPoint[]> {
    const snap = await adminDb.collection(SUBSCRIPTIONS_COLLECTION).where("createdAt", ">=", range.since).get();

    const counts = new Map<string, number>(range.bucketKeys.map((k) => [k, 0]));
    for (const doc of snap.docs) {
      const data = doc.data();
      const bucket = periodOf(Number(data.createdAt), range.granularity);
      if (!counts.has(bucket)) continue;
      counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
    }
    return range.bucketKeys.map((period) => ({ period, value: counts.get(period) ?? 0 }));
  },

  /** Count of currently-active subscriptions — the "current" figure the growth chart trends toward. */
  async activeSubscriptionCount(): Promise<number> {
    const snap = await adminDb.collection(SUBSCRIPTIONS_COLLECTION).where("status", "==", "active").count().get();
    return snap.data().count;
  },

  /**
   * Total confirmed revenue of all time (not just the charted window) —
   * the Analytics page's headline figure. Combines both payment models
   * (TASK-3302), same statuses as `monthlyRevenue`, so the headline and
   * the chart never disagree.
   */
  async totalConfirmedRevenue(): Promise<number> {
    const [invoiceSnap, paymentSnap] = await Promise.all([
      adminDb.collection(INVOICES_COLLECTION).where("status", "==", "confirmed").get(),
      adminDb.collection(PAYMENTS_COLLECTION).where("status", "in", [...CONFIRMED_PAYMENT_STATUSES]).get(),
    ]);
    const invoiceTotal = invoiceSnap.docs.reduce((sum, doc) => sum + Number(doc.data().amount ?? 0), 0);
    const paymentTotal = paymentSnap.docs.reduce((sum, doc) => sum + Number(doc.data().amount ?? 0), 0);
    return invoiceTotal + paymentTotal;
  },

  /** Count of invoices still awaiting manual review — surfaced so the Admin knows if the revenue figure is still settling. */
  async pendingInvoiceCount(): Promise<number> {
    const snap = await adminDb.collection(INVOICES_COLLECTION).where("status", "==", "pending").count().get();
    return snap.data().count;
  },

  /**
   * TASK-3303 — teachers ranked by total active students: the distinct
   * `studentId`s per `teacherId` across active enrollments (course-based)
   * and active subscriptions (Phase 29), unioned so a student counts once
   * per teacher even if they have both. Sorted descending, highest first.
   *
   * TASK-3304: also constrained to `range` — a student counts here if
   * their enrollment/subscription both is currently `active` and started
   * (`createdAt`) within the selected window, so this breakdown moves
   * with the same filter as the two time-series charts instead of always
   * showing the all-time snapshot.
   */
  async activeStudentCountsByTeacher(range: AnalyticsRange): Promise<RankedCount[]> {
    const [enrollSnap, subSnap] = await Promise.all([
      adminDb
        .collection(ENROLLMENTS_COLLECTION)
        .where("status", "==", "active")
        .where("createdAt", ">=", range.since)
        .where("createdAt", "<", range.until)
        .get(),
      adminDb
        .collection(SUBSCRIPTIONS_COLLECTION)
        .where("status", "==", "active")
        .where("createdAt", ">=", range.since)
        .where("createdAt", "<", range.until)
        .get(),
    ]);

    const byTeacher = new Map<string, Set<string>>();
    const add = (teacherId: string, studentId: string) => {
      if (!byTeacher.has(teacherId)) byTeacher.set(teacherId, new Set());
      byTeacher.get(teacherId)!.add(studentId);
    };
    for (const doc of enrollSnap.docs) {
      const data = doc.data();
      add(String(data.teacherId), String(data.studentId));
    }
    for (const doc of subSnap.docs) {
      const data = doc.data();
      add(String(data.teacherId), String(data.studentId));
    }

    return Array.from(byTeacher.entries())
      .map(([id, students]) => ({ id, count: students.size }))
      .sort((a, b) => b.count - a.count);
  },

  /**
   * TASK-3303 — subjects ranked by total active students: same
   * enrollment+subscription union as `activeStudentCountsByTeacher`, but
   * grouped by `subjectId`. Subscriptions carry `subjectId` directly;
   * enrollments only carry `courseId`, so their course docs are batch-read
   * (chunked `in`, same pattern as `teacherProfileRepository.findByIds`)
   * to resolve each enrollment's `subjectId`. TASK-3304: same `range`
   * constraint as `activeStudentCountsByTeacher` — see that method's note.
   */
  async activeStudentCountsBySubject(range: AnalyticsRange): Promise<RankedCount[]> {
    const [enrollSnap, subSnap] = await Promise.all([
      adminDb
        .collection(ENROLLMENTS_COLLECTION)
        .where("status", "==", "active")
        .where("createdAt", ">=", range.since)
        .where("createdAt", "<", range.until)
        .get(),
      adminDb
        .collection(SUBSCRIPTIONS_COLLECTION)
        .where("status", "==", "active")
        .where("createdAt", ">=", range.since)
        .where("createdAt", "<", range.until)
        .get(),
    ]);

    const courseIds = Array.from(new Set(enrollSnap.docs.map((doc) => String(doc.data().courseId))));
    const courseSubjects = new Map<string, string>();
    const CHUNK = 30;
    for (let i = 0; i < courseIds.length; i += CHUNK) {
      const chunk = courseIds.slice(i, i + CHUNK);
      if (chunk.length === 0) continue;
      const snap = await adminDb.collection(COURSES_COLLECTION).where("__name__", "in", chunk).get();
      for (const doc of snap.docs) courseSubjects.set(doc.id, String(doc.data().subjectId));
    }

    const bySubject = new Map<string, Set<string>>();
    const add = (subjectId: string | undefined, studentId: string) => {
      if (!subjectId) return;
      if (!bySubject.has(subjectId)) bySubject.set(subjectId, new Set());
      bySubject.get(subjectId)!.add(studentId);
    };
    for (const doc of enrollSnap.docs) {
      const data = doc.data();
      add(courseSubjects.get(String(data.courseId)), String(data.studentId));
    }
    for (const doc of subSnap.docs) {
      const data = doc.data();
      add(String(data.subjectId), String(data.studentId));
    }

    return Array.from(bySubject.entries())
      .map(([id, students]) => ({ id, count: students.size }))
      .sort((a, b) => b.count - a.count);
  },

  /**
   * TASK-3303 — distinct active students (same union as the two ranked
   * counts above), for the "student count per education stage" view. Each
   * student's `stageId` lives on their own `users` doc, not on an
   * enrollment/subscription, so this just returns the id set; the service
   * layer joins to `stageId` via `userRepository.findByIds` and groups.
   * TASK-3304: same `range` constraint as the two methods above.
   */
  async activeStudentIds(range: AnalyticsRange): Promise<string[]> {
    const [enrollSnap, subSnap] = await Promise.all([
      adminDb
        .collection(ENROLLMENTS_COLLECTION)
        .where("status", "==", "active")
        .where("createdAt", ">=", range.since)
        .where("createdAt", "<", range.until)
        .get(),
      adminDb
        .collection(SUBSCRIPTIONS_COLLECTION)
        .where("status", "==", "active")
        .where("createdAt", ">=", range.since)
        .where("createdAt", "<", range.until)
        .get(),
    ]);
    const ids = new Set<string>();
    for (const doc of enrollSnap.docs) ids.add(String(doc.data().studentId));
    for (const doc of subSnap.docs) ids.add(String(doc.data().studentId));
    return Array.from(ids);
  },
};
