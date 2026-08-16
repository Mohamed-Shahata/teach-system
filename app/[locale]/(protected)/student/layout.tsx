import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireSession } from "@/lib/auth/session";
import { userRepository } from "@/lib/server/repositories/userRepository";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StudentSidebar } from "@/components/layout/student-sidebar";

/**
 * TASK-1103 — student dashboard layout & nav, mirroring the teacher
 * layout (TASK-701). `proxy.ts` already redirects unauthenticated
 * visitors and role-gates `/student/*` to `session.role === "student"`
 * before this layout ever renders (docs/authentication/README.md,
 * TASK-406) — the check here is defense-in-depth for direct
 * server-side renders, not the primary guard.
 */
export default async function StudentLayout({ children, params }: LayoutProps<"/[locale]/student">) {
  const { locale } = await params;
  const session = await requireSession();
  if (session.role !== "student") {
    redirect(`/${locale}/${session.role}`);
  }

  const user = await userRepository.findById(session.uid);
  const displayName = user?.displayName ?? session.email ?? "";
  const t = await getTranslations("studentDashboard");

  return (
    <DashboardShell sidebar={<StudentSidebar />} displayName={displayName} topbarTitle={t("topbarTitle")}>
      {children}
    </DashboardShell>
  );
}
