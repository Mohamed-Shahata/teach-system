import type { ReactNode, CSSProperties } from "react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingHeroIllustration } from "@/components/landing/landing-hero-illustration";
import { getSession } from "@/lib/auth/session";

function FeatureIcon({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-primary transition-transform duration-300 group-hover:scale-110">
      {children}
    </div>
  );
}

export async function LandingPage() {
  const locale = await getLocale();
  const t = await getTranslations("landing");
  const tLayout = await getTranslations("layout");
  const session = await getSession();

  const features = [
    {
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
          <path
            d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5v-13Z"
            fill="currentColor"
            opacity="0.55"
          />
          <path d="M13 4h5.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H13V4Z" fill="currentColor" />
        </svg>
      ),
      title: t("features.courses.title"),
      description: t("features.courses.description"),
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
          <path
            d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-7 8.2a7 7 0 0 1 14 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M18 10.5a3 3 0 1 0-2.2 5.1M21 19.2a5.5 5.5 0 0 0-4.8-2.7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      ),
      title: t("features.students.title"),
      description: t("features.students.description"),
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
          <rect x="4" y="5" width="16" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 10h8M8 14h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ),
      title: t("features.quizzes.title"),
      description: t("features.quizzes.description"),
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
          <path
            d="M8 4h8l2 4v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d="M10 4v4h4V4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      ),
      title: t("features.files.title"),
      description: t("features.files.description"),
    },
  ];

  return (
    <div className="flex min-h-full flex-1 flex-col overflow-x-clip">
      <LandingHeader
        brandTitle={tLayout("title")}
        signInLabel={t("signIn")}
        locale={locale}
        navHomeLabel={t("nav.home")}
        navFeaturesLabel={t("nav.features")}
        dashboardLabel={session ? t("dashboard") : undefined}
        dashboardHref={session ? `/${locale}/${session.role}` : undefined}
      />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative isolate overflow-hidden">
          {/* Ambient animated background blobs */}
          <div
            aria-hidden="true"
            className="animate-blob pointer-events-none absolute -top-24 start-[-8rem] h-[26rem] w-[26rem] rounded-full bg-primary/20 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="animate-blob pointer-events-none absolute top-1/3 end-[-10rem] h-[30rem] w-[30rem] rounded-full bg-secondary/20 blur-3xl"
            style={{ animationDelay: "3s" }}
          />

          <div className="relative mx-auto grid max-w-7xl gap-14 px-6 py-20 lg:grid-cols-2 lg:items-center lg:py-32 xl:py-36">
            <div className="flex flex-col gap-7">
              <div className="animate-fade-up" style={{ "--delay": "0ms" } as CSSProperties}>
                <Badge variant="neutral">{t("hero.badge")}</Badge>
              </div>
              <div className="flex flex-col gap-5">
                <h1
                  className="animate-fade-up text-4xl font-bold leading-[1.1] text-foreground sm:text-5xl lg:text-6xl lg:leading-[1.08]"
                  style={{ "--delay": "80ms" } as CSSProperties}
                >
                  {t("hero.title")}
                </h1>
                <p
                  className="animate-fade-up max-w-xl text-lg leading-8 text-foreground/70 sm:text-xl"
                  style={{ "--delay": "160ms" } as CSSProperties}
                >
                  {t("hero.subtitle")}
                </p>
              </div>
              <div
                className="animate-fade-up flex flex-wrap items-center gap-4"
                style={{ "--delay": "240ms" } as CSSProperties}
              >
                <Link
                  href={session ? `/${locale}/${session.role}` : `/${locale}/login`}
                  className="inline-flex h-14 items-center justify-center rounded-full bg-primary px-8 text-base font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/30 active:translate-y-0"
                >
                  {session ? t("dashboard") : t("hero.ctaPrimary")}
                </Link>
                <a
                  href="#features"
                  className="inline-flex h-14 items-center justify-center rounded-full border border-border bg-transparent px-8 text-base font-medium text-foreground transition-all hover:-translate-y-0.5 hover:bg-surface-muted"
                >
                  {t("hero.ctaSecondary")}
                </a>
              </div>
            </div>

            <div
              className="animate-fade-up relative"
              style={{ "--delay": "200ms" } as CSSProperties}
            >
              <div className="animate-float-slow">
                <LandingHeroIllustration />
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t border-border bg-surface-muted/60">
          <div className="mx-auto max-w-7xl px-6 py-20 lg:py-28">
            <div className="animate-fade-up mx-auto mb-16 max-w-2xl text-center">
              <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">{t("features.heading")}</h2>
              <p className="mt-4 text-lg leading-8 text-foreground/70">{t("features.subtitle")}</p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {features.map((feature, i) => (
                <Card
                  key={feature.title}
                  className="group animate-fade-up h-full bg-surface p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5"
                  style={{ "--delay": `${i * 90}ms` } as CSSProperties}
                >
                  <CardHeader className="mb-0 gap-5">
                    <FeatureIcon>{feature.icon}</FeatureIcon>
                    <div className="flex flex-col gap-2">
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                      <CardDescription className="text-base leading-7">{feature.description}</CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="mx-auto max-w-7xl px-6 py-20 lg:py-28">
          <div className="animate-fade-up relative flex flex-col items-center gap-7 overflow-hidden rounded-3xl border border-border bg-surface px-6 py-16 text-center sm:px-10">
            <div
              aria-hidden="true"
              className="animate-gradient pointer-events-none absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage:
                  "linear-gradient(120deg, var(--color-primary), var(--color-secondary), var(--color-primary))",
              }}
            />
            <h2 className="relative text-3xl font-semibold text-foreground sm:text-4xl">{t("cta.title")}</h2>
            <p className="relative max-w-xl text-lg leading-8 text-foreground/70">{t("cta.subtitle")}</p>
            <Link
              href={session ? `/${locale}/${session.role}` : `/${locale}/login`}
              className="relative inline-flex h-14 items-center justify-center rounded-full bg-primary px-8 text-base font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/30"
            >
              {session ? t("dashboard") : t("cta.button")}
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-6 py-8 text-center sm:flex-row sm:justify-between sm:text-start">
          <p className="text-sm text-foreground/60">
            © {new Date().getFullYear()} {tLayout("title")}. {t("footer.rights")}
          </p>
        </div>
      </footer>
    </div>
  );
}
