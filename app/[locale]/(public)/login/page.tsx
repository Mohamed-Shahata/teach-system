import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/auth/login-form";
import { AuthShell } from "@/components/auth/auth-shell";

export async function generateMetadata() {
  const t = await getTranslations("auth.login");
  return { title: t("title") };
}

export default async function LoginPage() {
  const t = await getTranslations("auth.login");
  const tLayout = await getTranslations("layout");

  return (
    <AuthShell
      brandTitle={tLayout("title")}
      tagline={t("tagline")}
      illustrationVariant="learn"
      heading={t("welcomeBack")}
      subtitle={t("subtitle")}
      panelWidthClassName="lg:w-1/2"
    >
      <LoginForm />
    </AuthShell>
  );
}
