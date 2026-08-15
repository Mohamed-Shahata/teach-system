import { getTranslations } from "next-intl/server";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { AuthShell } from "@/components/auth/auth-shell";

export async function generateMetadata() {
  const t = await getTranslations("auth.forgotPassword");
  return { title: t("title") };
}

export default async function ForgotPasswordPage() {
  const t = await getTranslations("auth.forgotPassword");
  const tLayout = await getTranslations("layout");

  return (
    <AuthShell
      brandTitle={tLayout("title")}
      tagline={t("tagline")}
      illustrationVariant="key"
      heading={t("title")}
      subtitle={t("subtitle")}
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
