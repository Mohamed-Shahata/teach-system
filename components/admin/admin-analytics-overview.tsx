"use client";

import * as React from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import type { AnalyticsOverview } from "@/lib/server/services/analyticsService";
import type { AnalyticsGranularity } from "@/lib/server/repositories/analyticsRepository";
import type { LocalizedText } from "@/lib/server/repositories/subjectRepository";

interface AdminAnalyticsOverviewProps {
  initialOverview: AnalyticsOverview;
}

const GRANULARITIES: AnalyticsGranularity[] = ["month", "year", "5year"];

/** Same fallback pattern as `course-overview.tsx`/`teacher-manager.tsx`: prefer the active locale, fall back to the other. */
function localizedText(name: LocalizedText, locale: string): string {
  return (locale === "ar" ? name.ar : name.en) || name.en || name.ar;
}

/**
 * TASK-3304 — bucket key -> short localized axis label. The key's own
 * shape tells us the granularity: `YYYY-MM-DD` (month view, day label),
 * `YYYY-MM` (year view, month label), or `YYYY` (5year view, year label)
 * — see `analyticsRepository.buildRange`/`periodOf` for where these are produced.
 */
function bucketLabel(period: string, locale: string): string {
  const parts = period.split("-").map(Number);
  if (parts.length === 3) {
    const [year, month, day] = parts;
    const date = new Date(Date.UTC(year, month - 1, day));
    return new Intl.DateTimeFormat(locale, { day: "numeric", timeZone: "UTC" }).format(date);
  }
  if (parts.length === 2) {
    const [year, month] = parts;
    const date = new Date(Date.UTC(year, month - 1, 1));
    return new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }).format(date);
  }
  return period;
}

/**
 * Phase 4 — Admin Analytics. Client component (recharts requires a
 * browser) rendered by the server `AdminAnalyticsPage`, which pre-fetches
 * `initialOverview` so the first paint isn't an empty-state flash — same
 * server-fetch-then-client-render split as `AdminPaymentsOverview`.
 */
export function AdminAnalyticsOverview({ initialOverview }: AdminAnalyticsOverviewProps) {
  const t = useTranslations("adminDashboard.analytics");
  const locale = useLocale();
  const format = useFormatter();

  const [overview, setOverview] = React.useState(initialOverview);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function refresh(granularity: AnalyticsGranularity = overview.granularity) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/analytics?granularity=${granularity}`);
      if (!res.ok) throw new Error("analytics");
      const body = (await res.json()) as { overview: AnalyticsOverview };
      setOverview(body.overview);
    } catch {
      setError(t("errors.load"));
    } finally {
      setLoading(false);
    }
  }

  const revenueData = overview.monthlyRevenue.map((point) => ({
    label: bucketLabel(point.period, locale),
    value: point.value,
  }));
  const growthData = overview.subscriptionGrowth.map((point) => ({
    label: bucketLabel(point.period, locale),
    value: point.value,
  }));

  const cards = [
    { key: "totalStudents", value: format.number(overview.totalStudents) },
    { key: "totalTeachers", value: format.number(overview.totalTeachers) },
    { key: "activeSubscriptions", value: format.number(overview.activeSubscriptions) },
    { key: "totalRevenue", value: `${format.number(overview.totalRevenue)} ${t("currency")}` },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{t("title")}</h1>
          <p className="text-sm text-foreground/60">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border p-0.5" role="group" aria-label={t("filters.rangeLabel")}>
            {GRANULARITIES.map((g) => (
              <button
                key={g}
                type="button"
                disabled={loading}
                aria-pressed={overview.granularity === g}
                onClick={() => refresh(g)}
                className={`rounded px-2.5 py-1 text-xs font-medium disabled:opacity-50 ${
                  overview.granularity === g
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/60 hover:bg-background"
                }`}
              >
                {t(`filters.granularity.${g}`)}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => refresh()}
            disabled={loading}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground/70 hover:bg-background disabled:opacity-50"
          >
            {loading ? "…" : t("refresh")}
          </button>
          <a
            href={`/api/admin/analytics/export?granularity=${overview.granularity}`}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground/70 hover:bg-background"
          >
            {t("export")}
          </a>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {overview.pendingInvoices > 0 && (
        <p className="text-xs text-foreground/50">{t("pendingNote", { count: overview.pendingInvoices })}</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.key}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-foreground/60">{t(`cards.${card.key}`)}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("charts.revenue")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => `${format.number(Number(value ?? 0))} ${t("currency")}`} />
                  <Bar dataKey="value" fill="var(--color-primary, #2563eb)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("charts.growth")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growthData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="var(--color-secondary, #16a34a)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t("breakdowns.teachers")}</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.teacherBreakdown.length === 0 ? (
              <p className="text-sm text-foreground/50">{t("breakdowns.empty")}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {overview.teacherBreakdown.map((row) => (
                  <li key={row.id} className="flex items-center justify-between text-sm">
                    <span className="text-foreground/80">{row.label}</span>
                    <span className="font-medium text-foreground">{format.number(row.count)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("breakdowns.subjects")}</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.subjectBreakdown.length === 0 ? (
              <p className="text-sm text-foreground/50">{t("breakdowns.empty")}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {overview.subjectBreakdown.map((row) => (
                  <li key={row.id} className="flex items-center justify-between text-sm">
                    <span className="text-foreground/80">{localizedText(row.name, locale)}</span>
                    <span className="font-medium text-foreground">{format.number(row.count)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("breakdowns.stages")}</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.stageBreakdown.length === 0 ? (
              <p className="text-sm text-foreground/50">{t("breakdowns.empty")}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {overview.stageBreakdown.map((row) => (
                  <li key={row.id} className="flex items-center justify-between text-sm">
                    <span className="text-foreground/80">{localizedText(row.name, locale)}</span>
                    <span className="font-medium text-foreground">{format.number(row.count)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
