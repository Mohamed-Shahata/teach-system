import type { ReactNode, CSSProperties } from "react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingHeroIllustration } from "@/components/landing/landing-hero-illustration";
import { getSession } from "@/lib/auth/session";
import { publicService } from "@/lib/server/services/publicService";
import { EmptyState } from "@/components/ui/states";
import type { LocalizedText } from "@/lib/server/repositories/courseRepository";

function localizedText(text: Partial<LocalizedText> | undefined, locale: string): string | undefined {
  if (!text) return undefined;
  return (locale === "ar" ? text.ar : text.en) || text.en || text.ar;
}

function FeatureIcon({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-primary transition-transform duration-300 group-hover:scale-110">
      {children}
    </div>
  );
}

function StepNumber({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground">
      {children}
    </div>
  );
}

function QuoteMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-7 w-7 text-primary/30"
      aria-hidden="true"
    >
      <path
        d="M9.5 7C6.5 8 5 10.2 5 13.2c0 2.4 1.5 4 3.5 4 1.8 0 3.2-1.3 3.2-3.1 0-1.6-1.1-2.8-2.6-3 .3-1.4 1.6-2.6 3.4-3.1L9.5 7Zm9 0c-3 1-4.5 3.2-4.5 6.2 0 2.4 1.5 4 3.5 4 1.8 0 3.2-1.3 3.2-3.1 0-1.6-1.1-2.8-2.6-3 .3-1.4 1.6-2.6 3.4-3.1L18.5 7Z"
        fill="currentColor"
      />
    </svg>
  );
}

export async function LandingPage() {
  const locale = await getLocale();
  const t = await getTranslations("landing");
  const tLayout = await getTranslations("layout");
  const session = await getSession();
  const [showcaseCourses, showcaseTeachers] = await Promise.all([
    publicService.listShowcaseCourses(6),
    publicService.listShowcaseTeachers(6),
  ]);

  const features = [
    {
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
          <path
            d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5v-13Z"
            fill="currentColor"
            opacity="0.55"
          />
          <path
            d="M13 4h5.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H13V4Z"
            fill="currentColor"
          />
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
          <rect
            x="4"
            y="5"
            width="16"
            height="14"
            rx="2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M8 10h8M8 14h5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
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
          <path
            d="M10 4v4h4V4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      ),
      title: t("features.files.title"),
      description: t("features.files.description"),
    },
  ];

  const stats = [
    { value: t("stats.students.value"), label: t("stats.students.label") },
    { value: t("stats.teachers.value"), label: t("stats.teachers.label") },
    { value: t("stats.courses.value"), label: t("stats.courses.label") },
    {
      value: t("stats.satisfaction.value"),
      label: t("stats.satisfaction.label"),
    },
  ];

  const steps = [
    {
      title: t("howItWorks.step1.title"),
      description: t("howItWorks.step1.description"),
    },
    {
      title: t("howItWorks.step2.title"),
      description: t("howItWorks.step2.description"),
    },
    {
      title: t("howItWorks.step3.title"),
      description: t("howItWorks.step3.description"),
    },
  ];

  const testimonials = [
    {
      quote: t("testimonials.items.0.quote"),
      name: t("testimonials.items.0.name"),
      role: t("testimonials.items.0.role"),
      avatar:
        "https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=160&h=160&q=80",
    },
    {
      quote: t("testimonials.items.1.quote"),
      name: t("testimonials.items.1.name"),
      role: t("testimonials.items.1.role"),
      avatar:
        "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&w=160&h=160&q=80",
    },
    {
      quote: t("testimonials.items.2.quote"),
      name: t("testimonials.items.2.name"),
      role: t("testimonials.items.2.role"),
      avatar:
        "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=160&h=160&q=80",
    },
  ];

  const faqItems = [
    { question: t("faq.items.0.question"), answer: t("faq.items.0.answer") },
    { question: t("faq.items.1.question"), answer: t("faq.items.1.answer") },
    { question: t("faq.items.2.question"), answer: t("faq.items.2.answer") },
  ];

  return (
    <div className="flex min-h-full flex-1 flex-col overflow-x-clip">
      <LandingHeader
        brandTitle={tLayout("title")}
        signInLabel={t("signIn")}
        locale={locale}
        navHomeLabel={t("nav.home")}
        navFeaturesLabel={t("nav.features")}
        navShowcaseLabel={t("nav.showcase")}
        navHowItWorksLabel={t("nav.howItWorks")}
        navCoursesLabel={t("nav.courses")}
        navTeachersLabel={t("nav.teachers")}
        navTestimonialsLabel={t("nav.testimonials")}
        navFaqLabel={t("nav.faq")}
        dashboardLabel={session ? t("dashboard") : undefined}
        dashboardHref={session ? `/${locale}/${session.role}` : undefined}
      />

      <main className="flex-1">
        {/* Hero */}
        <section id="hero" className="relative isolate scroll-mt-20 overflow-hidden">
          {/* Ambient animated background blobs */}
          <div
            aria-hidden="true"
            className="animate-blob pointer-events-none absolute -top-24 -inset-s-32 h-104 w-104 rounded-full bg-primary/20 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="animate-blob pointer-events-none absolute top-1/3 -inset-e-40 h-120 w-120 rounded-full bg-secondary/20 blur-3xl"
            style={{ animationDelay: "3s" }}
          />

          <div className="relative mx-auto grid max-w-7xl gap-14 px-6 py-20 lg:grid-cols-2 lg:items-center lg:py-32 xl:py-36">
            <div className="flex flex-col gap-7">
              <div
                className="animate-fade-up"
                style={{ "--delay": "0ms" } as CSSProperties}
              >
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
                  href={
                    session ? `/${locale}/${session.role}` : `/${locale}/login`
                  }
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

              {/* Trust bar */}
              <div
                className="animate-fade-up mt-2 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-6 sm:grid-cols-4"
                style={{ "--delay": "300ms" } as CSSProperties}
              >
                {stats.map((stat) => (
                  <div key={stat.label} className="flex flex-col">
                    <span className="text-2xl font-bold text-foreground sm:text-3xl">
                      {stat.value}
                    </span>
                    <span className="text-sm text-foreground/60">
                      {stat.label}
                    </span>
                  </div>
                ))}
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
        <section
          id="features"
          className="border-t border-border bg-surface-muted/60"
        >
          <div className="mx-auto max-w-7xl px-6 py-20 lg:py-28">
            <div className="animate-fade-up mx-auto mb-16 max-w-2xl text-center">
              <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">
                {t("features.heading")}
              </h2>
              <p className="mt-4 text-lg leading-8 text-foreground/70">
                {t("features.subtitle")}
              </p>
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
                      <CardDescription className="text-base leading-7">
                        {feature.description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Product showcase */}
        <section id="showcase" className="scroll-mt-20 border-t border-border">
          <div className="mx-auto grid max-w-7xl gap-14 px-6 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
            <div className="animate-fade-up relative order-2 lg:order-1">
              <div className="overflow-hidden rounded-3xl border border-border shadow-2xl shadow-primary/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&h=900&q=80"
                  alt={t("showcase.heading")}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="absolute -bottom-6 -inset-s-6 hidden w-56 rounded-2xl border border-border bg-surface p-4 shadow-xl sm:block">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10 text-success">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      aria-hidden="true"
                    >
                      <path
                        d="m5 13 4 4L19 7"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {t("stats.satisfaction.value")}
                    </p>
                    <p className="text-xs text-foreground/60">
                      {t("stats.satisfaction.label")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="animate-fade-up order-1 flex flex-col gap-6 lg:order-2">
              <Badge variant="info">{t("showcase.badge")}</Badge>
              <h2 className="text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
                {t("showcase.heading")}
              </h2>
              <p className="text-lg leading-8 text-foreground/70">
                {t("showcase.subtitle")}
              </p>
              <ul className="flex flex-col gap-4">
                {[
                  t("showcase.point1"),
                  t("showcase.point2"),
                  t("showcase.point3"),
                ].map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      >
                        <path
                          d="m5 13 4 4L19 7"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <span className="text-base leading-7 text-foreground/80">
                      {point}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-20 border-t border-border bg-surface-muted/60">
          <div className="mx-auto max-w-7xl px-6 py-20 lg:py-28">
            <div className="animate-fade-up mx-auto mb-16 max-w-2xl text-center">
              <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">
                {t("howItWorks.heading")}
              </h2>
              <p className="mt-4 text-lg leading-8 text-foreground/70">
                {t("howItWorks.subtitle")}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
              {steps.map((step, i) => (
                <div
                  key={step.title}
                  className="animate-fade-up flex flex-col gap-4 rounded-2xl border border-border bg-surface p-7"
                  style={{ "--delay": `${i * 100}ms` } as CSSProperties}
                >
                  <StepNumber>{i + 1}</StepNumber>
                  <div className="flex flex-col gap-2">
                    <h3 className="text-lg font-semibold text-foreground">
                      {step.title}
                    </h3>
                    <p className="text-base leading-7 text-foreground/70">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Public courses */}
        <section id="courses" className="scroll-mt-20 border-t border-border">
          <div className="mx-auto max-w-7xl px-6 py-20 lg:py-28">
            <div className="animate-fade-up mx-auto mb-16 max-w-2xl text-center">
              <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">
                {t("publicCourses.heading")}
              </h2>
              <p className="mt-4 text-lg leading-8 text-foreground/70">
                {t("publicCourses.subtitle")}
              </p>
            </div>

            {showcaseCourses.length === 0 ? (
              <div className="animate-fade-up">
                <EmptyState title={t("publicCourses.empty")} />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {showcaseCourses.map((course, i) => (
                  <Link
                    key={course.id}
                    href={`/${locale}/courses/${course.slug}`}
                    className="animate-fade-up group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5"
                    style={{ "--delay": `${i * 90}ms` } as CSSProperties}
                  >
                    <div className="aspect-video w-full overflow-hidden bg-surface-muted">
                      {course.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={course.thumbnailUrl}
                          alt={localizedText(course.title, locale) ?? ""}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-primary/30">
                          <svg viewBox="0 0 24 24" className="h-10 w-10" aria-hidden="true">
                            <path
                              d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5v-13Z"
                              fill="currentColor"
                              opacity="0.55"
                            />
                            <path d="M13 4h5.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H13V4Z" fill="currentColor" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-6">
                      <h3 className="text-lg font-semibold text-foreground">
                        {localizedText(course.title, locale)}
                      </h3>
                      {course.description && (
                        <p className="line-clamp-2 text-sm leading-6 text-foreground/70">
                          {localizedText(course.description, locale)}
                        </p>
                      )}
                      <span className="mt-auto pt-3 text-sm font-medium text-primary">
                        {t("publicCourses.viewCourse")} &larr;
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Public teachers */}
        <section id="teachers" className="scroll-mt-20 border-t border-border bg-surface-muted/60">
          <div className="mx-auto max-w-7xl px-6 py-20 lg:py-28">
            <div className="animate-fade-up mx-auto mb-16 max-w-2xl text-center">
              <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">
                {t("publicTeachers.heading")}
              </h2>
              <p className="mt-4 text-lg leading-8 text-foreground/70">
                {t("publicTeachers.subtitle")}
              </p>
            </div>

            {showcaseTeachers.length === 0 ? (
              <div className="animate-fade-up">
                <EmptyState title={t("publicTeachers.empty")} />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {showcaseTeachers.map((teacher, i) => (
                  <Link
                    key={teacher.teacherId}
                    href={`/${locale}/teachers/${teacher.slug}`}
                    className="animate-fade-up group flex flex-col items-center gap-4 rounded-2xl border border-border bg-surface p-7 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5"
                    style={{ "--delay": `${i * 90}ms` } as CSSProperties}
                  >
                    {teacher.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={teacher.avatarUrl}
                        alt={teacher.displayName}
                        className="h-20 w-20 rounded-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-semibold text-primary">
                        {teacher.displayName.charAt(0)}
                      </div>
                    )}
                    <div className="flex flex-col gap-1">
                      <h3 className="text-lg font-semibold text-foreground">{teacher.displayName}</h3>
                      {teacher.bio && (
                        <p className="line-clamp-2 text-sm leading-6 text-foreground/70">{teacher.bio}</p>
                      )}
                    </div>
                    <span className="mt-auto text-sm font-medium text-primary">
                      {t("publicTeachers.viewProfile")} &larr;
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Testimonials */}
        <section id="testimonials" className="scroll-mt-20 border-t border-border">
          <div className="mx-auto max-w-7xl px-6 py-20 lg:py-28">
            <div className="animate-fade-up mx-auto mb-16 max-w-2xl text-center">
              <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">
                {t("testimonials.heading")}
              </h2>
              <p className="mt-4 text-lg leading-8 text-foreground/70">
                {t("testimonials.subtitle")}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {testimonials.map((item, i) => (
                <Card
                  key={item.name}
                  className="animate-fade-up flex h-full flex-col gap-5 bg-surface p-7"
                  style={{ "--delay": `${i * 100}ms` } as CSSProperties}
                >
                  <QuoteMark />
                  <p className="flex-1 text-base leading-7 text-foreground/80">
                    {item.quote}
                  </p>
                  <div className="flex items-center gap-3 border-t border-border pt-5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.avatar}
                      alt={item.name}
                      className="h-11 w-11 shrink-0 rounded-full object-cover"
                      loading="lazy"
                    />
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {item.name}
                      </p>
                      <p className="text-sm text-foreground/60">{item.role}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 border-t border-border bg-surface-muted/60">
          <div className="mx-auto max-w-4xl px-6 py-20 lg:py-28">
            <div className="animate-fade-up mx-auto mb-16 max-w-2xl text-center">
              <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">
                {t("faq.heading")}
              </h2>
              <p className="mt-4 text-lg leading-8 text-foreground/70">
                {t("faq.subtitle")}
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {faqItems.map((item, i) => (
                <details
                  key={item.question}
                  className="animate-fade-up group rounded-2xl border border-border bg-surface p-6 open:shadow-md"
                  style={{ "--delay": `${i * 80}ms` } as CSSProperties}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-start text-lg font-medium text-foreground">
                    {item.question}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-foreground/60 transition-transform duration-300 group-open:rotate-45">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        aria-hidden="true"
                      >
                        <path
                          d="M12 5v14M5 12h14"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                  </summary>
                  <p className="mt-4 text-base leading-7 text-foreground/70">
                    {item.answer}
                  </p>
                </details>
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
            <h2 className="relative text-3xl font-semibold text-foreground sm:text-4xl">
              {t("cta.title")}
            </h2>
            <p className="relative max-w-xl text-lg leading-8 text-foreground/70">
              {t("cta.subtitle")}
            </p>
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
            © {new Date().getFullYear()} {tLayout("title")}.{" "}
            {t("footer.rights")}
          </p>
        </div>
      </footer>
    </div>
  );
}
