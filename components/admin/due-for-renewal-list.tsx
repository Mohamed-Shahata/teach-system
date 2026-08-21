"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { DueForRenewalRow } from "@/lib/server/services/adminSubscriptionsDueForRenewalService";

interface DueForRenewalListProps {
  subscriptions: DueForRenewalRow[];
}

/**
 * TASK-3404 — "Subscriptions due for renewal" list. Same shape as
 * TASK-3403's `UnsubscribedStudentsList` (short scrollable list, not a
 * full table) since both are quick Admin follow-up glances rather than
 * browsable data. Each row links to the student's TASK-3307 profile
 * page, where the Admin can start TASK-3402's manual-subscribe flow to
 * record the renewal payment.
 */
export function DueForRenewalList({ subscriptions }: DueForRenewalListProps) {
  const t = useTranslations("adminDashboard.payments.dueForRenewal");

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>
        <p className="text-sm text-foreground/60">{t("subtitle")}</p>
      </div>

      {subscriptions.length === 0 ? (
        <p className="text-sm text-foreground/60">{t("empty")}</p>
      ) : (
        <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto">
          {subscriptions.map((row) => (
            <li key={row.subscriptionId}>
              <Link
                href={`/admin/students/${row.studentId}`}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:bg-foreground/5"
              >
                <span className="flex flex-col">
                  <span className="font-medium text-foreground">{row.studentName}</span>
                  <span className="text-foreground/60">{t("withTeacher", { teacher: row.teacherName })}</span>
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
