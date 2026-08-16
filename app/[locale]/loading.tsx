import { getTranslations } from "next-intl/server";
import { LogoMark } from "@/components/brand/logo-mark";

/**
 * Next.js renders this automatically while any `/[locale]/*` route
 * segment is loading — covers the login navigation and any other
 * server-rendered page transition under this layout.
 */
export default async function LocaleLoading() {
  const t = await getTranslations("layout");

  return (
    <div className="grid min-h-screen place-items-center overflow-hidden bg-background">
      <div className="flex flex-col items-center gap-6">
        <div className="relative flex h-20 w-20 items-center justify-center">
          {/* Soft ambient glow behind the mark */}
          <span
            aria-hidden="true"
            className="loader-mark absolute h-20 w-20 rounded-full bg-primary/20 blur-xl"
          />
          {/* Spinning ring */}
          <span
            aria-hidden="true"
            className="loader-ring absolute h-16 w-16 rounded-full border-2 border-primary/25 border-t-primary"
          />
          {/* Brand mark — always circular by construction */}
          <LogoMark className="loader-mark relative h-10 w-10 rounded-full shadow-lg shadow-primary/20" id="loader-brand" />
        </div>

        <div className="loader-text flex flex-col items-center gap-3">
          <span className="text-lg font-semibold tracking-tight text-foreground">{t("title")}</span>
          <span
            role="status"
            aria-label="Loading"
            className="loader-shimmer relative h-1 w-32 overflow-hidden rounded-full bg-surface-muted"
          />
        </div>
      </div>
    </div>
  );
}
