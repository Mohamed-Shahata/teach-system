import { getTranslations } from "next-intl/server";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";

// TODO(TASK-1401 - Public Pages): replace with the real marketing/landing
// page. Placeholder only, to keep the route tree buildable during
// foundation setup.
export default async function HomePage() {
  const t = await getTranslations("common");
  return (
    <div className="p-6 flex items-center gap-3">
      <p>{t("comingSoon")}</p>
      <ThemeToggle />
      <LocaleSwitcher />
    </div>
  );
}
