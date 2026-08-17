import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireSession } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/errors";
import { teacherManagementService } from "@/lib/server/services/teacherManagementService";
import { reviewService } from "@/lib/server/services/reviewService";
import { Breadcrumb } from "@/components/ui";
import { ReviewsPanel } from "@/components/admin/reviews-panel";

/**
 * TASK-2704 — Admin's per-teacher review moderation queue, reached from
 * `TeacherManager`'s "View reviews" row action. Mirrors TASK-2403's
 * `admin/teachers/[teacherId]/students` page shape.
 */
export default async function AdminTeacherReviewsPage({
  params,
}: PageProps<"/[locale]/admin/teachers/[teacherId]/reviews">) {
  const { locale, teacherId } = await params;
  const t = await getTranslations();
  const session = await requireSession();

  let teacher;
  try {
    teacher = await teacherManagementService.getTeacherDetail(session, teacherId);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }
  const reviews = await reviewService.listForModeration(session, teacherId);

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumb
        items={[
          { label: t("adminDashboard.nav.teachers"), href: `/${locale}/admin/teachers` },
          { label: t("adminDashboard.reviews.pageTitle", { name: teacher.displayName }) },
        ]}
      />
      <h1 className="text-2xl font-semibold text-foreground">
        {t("adminDashboard.reviews.pageTitle", { name: teacher.displayName })}
      </h1>
      <ReviewsPanel initialReviews={reviews} />
    </div>
  );
}
