import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { parseTheme, THEME_COOKIE_NAME } from "@/lib/theme";
import { isSupportedLocale, isRtl, locales } from "@/i18n/config";
import "@fontsource-variable/inter/wght.css";
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/500.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "@fontsource/ibm-plex-sans-arabic/700.css";
import "./globals.css";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("layout");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  // Enables static rendering for this locale (next-intl requirement).
  setRequestLocale(locale);

  const messages = await getMessages();
  const rtl = isRtl(locale);

  const cookieStore = await cookies();
  const initialTheme = parseTheme(cookieStore.get(THEME_COOKIE_NAME)?.value);

  return (
    <html
      lang={locale}
      dir={rtl ? "rtl" : "ltr"}
      data-theme={initialTheme ?? undefined}
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider initialTheme={initialTheme}>{children}</ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
