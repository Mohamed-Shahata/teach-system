"use client";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { locales } from "@/i18n/config";
import { DropdownMenu } from "@/components/ui/dropdown-menu";

/**
 * Switches between supported locales while preserving the current path
 * and query string. The `[locale]` segment is replaced in-place, so this
 * works from any route (TASK-304).
 */
export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("locale");
  const pathname = usePathname();
  const router = useRouter();

  function switchTo(nextLocale: string) {
    if (nextLocale === locale) return;
    const segments = pathname.split("/");
    // segments[0] is "" (leading slash), segments[1] is the current locale.
    segments[1] = nextLocale;
    router.push(segments.join("/") || "/");
  }

  return (
    <DropdownMenu
      trigger={
        <span className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-surface-muted">
          <span aria-hidden="true">🌐</span>
          {t(locale as "en" | "ar")}
        </span>
      }
      items={locales.map((loc) => ({
        label: t(loc),
        onSelect: () => switchTo(loc),
        disabled: loc === locale,
      }))}
    />
  );
}
