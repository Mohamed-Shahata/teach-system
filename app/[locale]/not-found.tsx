import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("errors");

  return (
    <div className="grid min-h-screen place-items-center bg-background px-6 py-12">
      <div className="flex flex-col items-center gap-6 text-center">
        <svg viewBox="0 0 240 160" className="h-40 w-56" aria-hidden="true">
          <ellipse cx="120" cy="146" rx="90" ry="8" className="fill-border" />
          <circle cx="120" cy="72" r="58" className="fill-surface-muted" />
          <text
            x="120"
            y="90"
            textAnchor="middle"
            className="fill-primary"
            style={{ fontSize: 44, fontWeight: 700 }}
          >
            404
          </text>
          <circle cx="150" cy="95" r="14" fill="none" className="stroke-primary" strokeWidth="4" />
          <line x1="160" y1="105" x2="180" y2="125" className="stroke-primary" strokeWidth="4" strokeLinecap="round" />
        </svg>

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-foreground">{t("notFound")}</h1>
          <p className="max-w-sm text-sm leading-6 text-foreground/60">{t("notFoundDescription")}</p>
        </div>

        <Link
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          {t("backHome")}
        </Link>
      </div>
    </div>
  );
}
