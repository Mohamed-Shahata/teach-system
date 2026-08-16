import { redirect } from "next/navigation";

/**
 * `/{locale}/admin` has no content of its own — the real landing page
 * is `/{locale}/admin/dashboard`. Mirrors `teacher/page.tsx` and
 * `student/page.tsx`: exists so that redirect targets which only know
 * the role segment (the post-login redirect in
 * `components/auth/login-form.tsx`, and `proxy.ts`'s role-mismatch
 * redirect) land somewhere real instead of a 404.
 */
export default async function AdminIndexPage({ params }: PageProps<"/[locale]/admin">) {
  const { locale } = await params;
  redirect(`/${locale}/admin/dashboard`);
}
