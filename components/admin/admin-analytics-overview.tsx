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

interface AdminAnalyticsOverviewProps {
  initialOverview: AnalyticsOverview;
}

/** `"2026-08"` -> a short localized month label, e.g. `"Aug"` / `"أغسطس"`. */
function monthLabel(period: string, locale: string): string {
  const [year, month] = period.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  return new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }).format(date);
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

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/analytics");
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
    label: monthLabel(point.period, locale),
    value: point.value,
  }));
  const growthData = overview.subscriptionGrowth.map((point) => ({
    label: monthLabel(point.period, locale),
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
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground/70 hover:bg-background disabled:opacity-50"
        >
          {loading ? "…" : t("refresh")}
        </button>
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
    </div>
  );
}
