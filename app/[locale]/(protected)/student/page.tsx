import { redirect } from "next/navigation";

/**
 * `/{locale}/student` has no content of its own — the real landing page
 * is `/{locale}/student/dashboard`. Mirrors `teacher/page.tsx`: exists so
 * that redirect targets which only know the role segment (the post-login
 * redirect in `components/auth/login-form.tsx`, and `proxy.ts`'s
 * role-mismatch redirect) land somewhere real instead of a 404.
 */
export default async function StudentIndexPage({ params }: PageProps<"/[locale]/student">) {
  const { locale } = await params;
  redirect(`/${locale}/student/dashboard`);
}
