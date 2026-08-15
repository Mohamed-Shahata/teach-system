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
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-foreground/70 hover:bg-surface-muted hover:text-foreground"
          role="button"
          aria-label={t(locale as "en" | "ar")}
        >
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path
              d="M3 12h18M12 3c2.5 2.5 3.8 5.7 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.7-3.8-9S9.5 5.5 12 3Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
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
