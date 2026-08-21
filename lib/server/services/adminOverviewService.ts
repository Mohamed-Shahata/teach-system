import "server-only";
import { assertRole } from "@/lib/auth/guards";
import type { Session } from "@/lib/auth/session";
import { userRepository } from "@/lib/server/repositories/userRepository";
import { paymentService } from "@/lib/server/services/paymentService";
import { subscriptionInvoiceService } from "@/lib/server/services/subscriptionInvoiceService";
import type { PaymentStatus } from "@/lib/validation/payment.schema";
import type { InvoiceStatus } from "@/lib/validation/subscriptionInvoice.schema";

/**
 * TASK-3301 — Admin overview page's "recently joined students" and
 * "recent payments" mini-lists. Reuses two already center-wide, already
 * Admin-allowed reads rather than adding new repository queries:
 * `paymentService.listForTeacher` (course payments, TASK-1104) and
 * `subscriptionInvoiceService.listForTeacher` (subscription invoices,
 * Phase 29) both already unscope to every teacher for an `admin`
 * session (`scopeToTeacher`'s admin bypass) — this service's only job is
 * merging the two payment models into one recency-sorted list, plus the
 * student side.
 */

const RECENT_LIMIT = 5;

export interface RecentStudent {
  uid: string;
  displayName: string;
  email: string;
  createdAt: number;
}

export type RecentPaymentSource = "payment" | "subscriptionInvoice";

export interface RecentPayment {
  id: string;
  source: RecentPaymentSource;
  studentId: string;
  amount: number;
  currency: string;
  status: PaymentStatus | InvoiceStatus;
  createdAt: number;
}

export interface AdminRecentActivity {
  recentStudents: RecentStudent[];
  recentPayments: RecentPayment[];
}

export const adminOverviewService = {
  async getRecentActivity(session: Session): Promise<AdminRecentActivity> {
    assertRole(session, "admin");

    const [students, payments, invoices] = await Promise.all([
      userRepository.listByRole("student"),
      paymentService.listForTeacher(session),
      subscriptionInvoiceService.listForTeacher(session),
    ]);

    const recentStudents = [...students]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, RECENT_LIMIT)
      .map((user) => ({
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        createdAt: user.createdAt,
      }));

    const merged: RecentPayment[] = [
      ...payments.map((payment) => ({
        id: payment.id,
        source: "payment" as const,
        studentId: payment.studentId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        createdAt: payment.createdAt,
      })),
      ...invoices.map((invoice) => ({
        id: invoice.id,
        source: "subscriptionInvoice" as const,
        studentId: invoice.studentId,
        amount: invoice.amount,
        currency: invoice.currency,
        status: invoice.status,
        createdAt: invoice.createdAt,
      })),
    ];

    const recentPayments = merged.sort((a, b) => b.createdAt - a.createdAt).slice(0, RECENT_LIMIT);

    return { recentStudents, recentPayments };
  },
};
