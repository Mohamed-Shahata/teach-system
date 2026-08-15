import type { ReactNode } from "react";
import { AuthIllustration, type AuthIllustrationVariant } from "@/components/auth/auth-illustration";

function BrandMark() {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
        <path d="M12 3 1 8l11 5 9-4.09V17h2V8L12 3Z" fill="currentColor" />
        <path
          d="M5 10.18v4.68C5 17.1 8.13 19 12 19s7-1.9 7-4.14v-4.68l-7 3.18-7-3.18Z"
          fill="currentColor"
          opacity="0.55"
        />
      </svg>
    </div>
  );
}

export function AuthShell({
  brandTitle,
  tagline,
  illustrationVariant,
  heading,
  subtitle,
  panelWidthClassName = "lg:w-[480px]",
  innerMaxWidthClassName = "max-w-sm",
  children,
}: {
  brandTitle: string;
  tagline: string;
  illustrationVariant: AuthIllustrationVariant;
  heading: string;
  subtitle: string;
  panelWidthClassName?: string;
  innerMaxWidthClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1">
      <div className="relative hidden flex-1 lg:block">
        <AuthIllustration tagline={tagline} variant={illustrationVariant} />
      </div>

      <div
        className={`flex w-full flex-1 items-center justify-center bg-background p-6 ${panelWidthClassName} lg:flex-none`}
      >
        <div className={`w-full ${innerMaxWidthClassName}`}>
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <BrandMark />
            <h1 className="text-xl font-semibold text-foreground">{brandTitle}</h1>
          </div>

          <div className="mb-6 flex flex-col items-center gap-1 text-center">
            <h2 className="text-lg font-semibold text-foreground">{heading}</h2>
            <p className="text-sm text-foreground/60">{subtitle}</p>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
