import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { parseTheme, THEME_COOKIE_NAME } from "@/lib/theme";
import "./globals.css";

// TODO(TASK-2xx - Design System): swap for self-hosted Inter / IBM Plex
// Sans Arabic via next/font/local, per `design-system/typography.md`.
// Plain system stack for now — out of scope for the foundation skeleton.

export const metadata: Metadata = {
  title: "Teacher SaaS Platform",
  description:
    "Multi-tenant educational platform for teachers: courses, lessons, students, enrollments, quizzes, and files.",
};

// TODO(TASK-301 - Internationalization): read `params.locale`, validate it
// against the supported locale list, and set `lang`/`dir` accordingly via
// next-intl. Hardcoded to `en`/`ltr` until that phase.
export default async function LocaleLayout({ children }: LayoutProps<"/[locale]">) {
  const cookieStore = await cookies();
  const initialTheme = parseTheme(cookieStore.get(THEME_COOKIE_NAME)?.value);

  return (
    <html
      lang="en"
      dir="ltr"
      data-theme={initialTheme ?? undefined}
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider initialTheme={initialTheme}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
