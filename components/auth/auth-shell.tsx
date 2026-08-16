import type { ReactNode } from "react";
import { AuthIllustration, type AuthIllustrationVariant } from "@/components/auth/auth-illustration";
import { LogoMark } from "@/components/brand/logo-mark";

function BrandMark() {
  return <LogoMark className="h-12 w-12 shrink-0" id="auth-brand" />;
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
