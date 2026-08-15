import { redirect } from "next/navigation";

/**
 * `/{locale}/teacher` has no content of its own — the real landing page
 * is `/{locale}/teacher/dashboard`. This index route exists so that
 * redirect targets which only know the role segment (the post-login
 * redirect in `components/auth/login-form.tsx`, and `proxy.ts`'s
 * role-mismatch redirect) land somewhere real instead of a 404.
 */
export default async function TeacherIndexPage({ params }: PageProps<"/[locale]/teacher">) {
  const { locale } = await params;
  redirect(`/${locale}/teacher/dashboard`);
}
