"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { UnsubscribedStudentRow } from "@/lib/server/services/adminUnsubscribedStudentsService";

interface UnsubscribedStudentsListProps {
  students: UnsubscribedStudentRow[];
}

/**
 * TASK-3403 — "Students with no active teacher subscription" list.
 * Read-only, low-traffic Admin surface (same reasoning as the rest of
 * this page): a short scrollable list rather than a full paginated
 * table, since it's meant for a quick follow-up glance, not browsing.
 * Each row links to the student's TASK-3307 profile page, which is
 * where the Admin can start TASK-3402's manual-subscribe flow.
 */
export function UnsubscribedStudentsList({ students }: UnsubscribedStudentsListProps) {
  const t = useTranslations("adminDashboard.payments.unsubscribed");

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>
        <p className="text-sm text-foreground/60">{t("subtitle")}</p>
      </div>

      {students.length === 0 ? (
        <p className="text-sm text-foreground/60">{t("empty")}</p>
      ) : (
        <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto">
          {students.map((student) => (
            <li key={student.uid}>
              <Link
                href={`/admin/students/${student.uid}`}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:bg-foreground/5"
              >
                <span className="flex flex-col">
                  <span className="font-medium text-foreground">{student.displayName}</span>
                  <span className="text-foreground/60">{student.email}</span>
                </span>
                <span className="text-primary">{t("viewProfile")}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
