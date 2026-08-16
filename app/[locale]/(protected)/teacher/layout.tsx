import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { userRepository } from "@/lib/server/repositories/userRepository";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { TeacherSidebar } from "@/components/layout/teacher-sidebar";

/**
 * TASK-701 — Teacher dashboard layout & nav.
 *
 * `proxy.ts` already redirects unauthenticated visitors and role-gates
 * `/teacher/*` to `session.role === "teacher"` before this layout ever
 * renders (see docs/authentication/README.md, TASK-406), so the checks
 * here are defense-in-depth for direct server-side renders, not the
 * primary guard.
 */
export default async function TeacherLayout({ children, params }: LayoutProps<"/[locale]/teacher">) {
  const { locale } = await params;
  const session = await requireSession();
  if (session.role !== "teacher") {
    redirect(`/${locale}/${session.role}`);
  }

  const user = await userRepository.findById(session.uid);
  const displayName = user?.displayName ?? session.email ?? "";

  return (
    <DashboardShell sidebar={<TeacherSidebar />} displayName={displayName} avatarUrl={user?.avatarUrl}>
      {children}
    </DashboardShell>
  );
}
