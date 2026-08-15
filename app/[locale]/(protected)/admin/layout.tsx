import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { userRepository } from "@/lib/server/repositories/userRepository";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AdminSidebar } from "@/components/layout/admin-sidebar";

/**
 * TASK-1901 (minimal) — Admin dashboard layout & nav. `proxy.ts` already
 * role-gates `/admin/*` to `session.role === "admin"` before this layout
 * renders; the check here is defense-in-depth for direct server-side
 * renders, matching `teacher/layout.tsx`.
 */
export default async function AdminLayout({ children, params }: LayoutProps<"/[locale]/admin">) {
  const { locale } = await params;
  const session = await requireSession();
  if (session.role !== "admin") {
    redirect(`/${locale}/${session.role}`);
  }

  const user = await userRepository.findById(session.uid);
  const displayName = user?.displayName ?? session.email ?? "";

  return (
    <DashboardShell sidebar={<AdminSidebar />} displayName={displayName}>
      {children}
    </DashboardShell>
  );
}
