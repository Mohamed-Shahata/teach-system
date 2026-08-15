import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { Spinner } from "@/components/ui/states";

export async function generateMetadata() {
  const t = await getTranslations("auth.resetPassword");
  return { title: t("title") };
}

export default async function ResetPasswordPage() {
  const t = await getTranslations("auth.resetPassword");
  const tLayout = await getTranslations("layout");

  return (
    <AuthShell
      brandTitle={tLayout("title")}
      tagline={t("tagline")}
      illustrationVariant="shield"
      heading={t("title")}
      subtitle={t("subtitle")}
    >
      <Suspense
        fallback={
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
