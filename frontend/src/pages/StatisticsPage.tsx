import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/auth-hook";
import { getStats, getForecast, listSubscriptions } from "@/api/subscriptions";
import type {
  SubscriptionStats,
  Subscription,
  SubscriptionForecast,
  MonthlyForecast,
} from "@/api/types";
import { toast } from "@/components/ui/toast-store";
import { isNonAuthError } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Tooltip,
  ResponsiveContainer,
  Sector,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import type { PieSectorShapeProps } from "recharts";

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
];

interface CategoryData {
  name: string;
  value: number;
}

interface TopSubData {
  name: string;
  cost: number;
}

interface ChartMonth {
  year_month: string;
  total: number;
  label: string;
}

function formatYearMonthLabel(yearMonth: string, locale: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  if (!y || !m) return yearMonth;
  return new Date(y, m - 1, 1).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
  });
}

export default function StatisticsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [forecast, setForecast] = useState<SubscriptionForecast | null>(null);
  const [selectedYearMonth, setSelectedYearMonth] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const baseCurrency =
    forecast?.base_currency ?? stats?.base_currency ?? user?.base_currency ?? "CNY";
  const locale = i18n.language;

  const fetchData = useCallback(async () => {
    try {
      const [statsData, subsData, forecastData] = await Promise.all([
        getStats(),
        listSubscriptions(),
        getForecast(),
      ]);
      setStats(statsData);
      setSubscriptions(subsData);
      setForecast(forecastData);
    } catch (err) {
      // 401 handled by interceptor; surface all other failures.
      if (isNonAuthError(err)) {
        toast({ title: t("errors.loadFailed"), variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const hasData = subscriptions.length > 0;

  // Category distribution data — answers "where does my money go"
  const categoryData: CategoryData[] = stats
    ? Object.entries(stats.by_category).map(([name, value]) => ({
        name: name || t("statistics.category"),
        value,
      }))
    : [];

  // Top 5 subscriptions — answers "which ones cost the most"
  const topSubs: TopSubData[] = subscriptions
    .filter((s) => s.converted_price != null && s.status === "active")
    .sort((a, b) => (b.converted_price ?? 0) - (a.converted_price ?? 0))
    .slice(0, 5)
    .map((s) => ({ name: s.name, cost: s.converted_price ?? 0 }));

  const chartMonths: ChartMonth[] =
    forecast?.months.map((m) => ({
      year_month: m.year_month,
      total: m.total,
      label: formatYearMonthLabel(m.year_month, locale),
    })) ?? [];

  const selectedMonth: MonthlyForecast | null =
    forecast && selectedYearMonth
      ? (forecast.months.find((m) => m.year_month === selectedYearMonth) ?? null)
      : null;

  const fmt = (value: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: baseCurrency,
    }).format(value);

  const fmtDate = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  if (loading) {
    return (
      <p className="text-muted-foreground" role="status" aria-live="polite">
        {t("statistics.loading")}
      </p>
    );
  }

  if (!hasData) {
    return (
      <div className="space-y-6">
        <h2 className="font-heading text-[clamp(1.5rem,3vw,2rem)] font-bold leading-tight tracking-[-0.01em]">
          {t("statistics.title")}
        </h2>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{t("statistics.noData")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("statistics.addFirst")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 [&_.recharts-text]:fill-muted-foreground [&_.recharts-pie-label-text]:fill-foreground">
      <h2 className="font-heading text-2xl font-bold leading-tight tracking-[-0.01em]">
        {t("statistics.title")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("statistics.subtitle")}</p>

      {/* 12-month cashflow forecast */}
      {forecast && (
        <Card className="transition-shadow hover:shadow-ambient-low">
          <CardHeader>
            <CardTitle>{t("statistics.monthlyForecast")}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("statistics.monthlyForecastSubtitle")}
            </p>
          </CardHeader>
          <CardContent>
            {chartMonths.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={chartMonths}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                      width={56}
                      tickFormatter={(v: number) =>
                        new Intl.NumberFormat(locale, {
                          notation: "compact",
                          maximumFractionDigits: 1,
                        }).format(v)
                      }
                    />
                    <Tooltip
                      formatter={(value) => fmt(Number(value))}
                      labelFormatter={(_, payload) => {
                        const item = payload?.[0]?.payload as ChartMonth | undefined;
                        return item?.label ?? "";
                      }}
                      contentStyle={{
                        backgroundColor: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius)",
                        color: "var(--popover-foreground)",
                      }}
                      itemStyle={{
                        color: "var(--popover-foreground)",
                      }}
                      labelStyle={{
                        color: "var(--foreground)",
                      }}
                      cursor={{ fill: "var(--muted)", opacity: 0.35 }}
                    />
                    <Bar
                      dataKey="total"
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                      onClick={(data) => {
                        const payload = data?.payload as ChartMonth | undefined;
                        const ym = payload?.year_month;
                        if (!ym) return;
                        setSelectedYearMonth((prev) => (prev === ym ? null : ym));
                      }}
                    >
                      {chartMonths.map((m) => (
                        <Cell
                          key={m.year_month}
                          fill={
                            selectedYearMonth === m.year_month
                              ? "var(--primary)"
                              : "var(--chart-1)"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                {!selectedMonth && (
                  <p className="mt-3 text-center text-sm text-muted-foreground">
                    {t("statistics.forecastClickHint")}
                  </p>
                )}

                {selectedMonth && (
                  <div className="mt-4 space-y-3 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium">
                        {t("statistics.forecastDetailTitle", {
                          month: formatYearMonthLabel(
                            selectedMonth.year_month,
                            locale
                          ),
                        })}
                      </h3>
                      <span className="font-variant-numeric tabular-nums text-sm font-semibold">
                        {fmt(selectedMonth.total)}
                      </span>
                    </div>
                    {selectedMonth.items.length === 0 ? (
                      <p className="py-4 text-center text-sm text-muted-foreground">
                        {t("statistics.forecastEmptyMonth")}
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {selectedMonth.items.map((item, idx) => (
                          <li
                            key={`${item.subscription_id}-${item.billing_date}-${idx}`}
                            className="flex items-center justify-between rounded-lg border p-3 text-sm"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-medium">{item.name}</p>
                              <p className="text-muted-foreground">
                                {fmtDate(item.billing_date)}
                              </p>
                            </div>
                            <span className="ml-3 shrink-0 font-variant-numeric tabular-nums font-semibold">
                              {fmt(item.amount)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="py-12 text-center text-muted-foreground">
                {t("statistics.noData")}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Category Distribution — "where does my money go" */}
        <Card className="transition-shadow hover:shadow-ambient-low">
          <CardHeader>
            <CardTitle>{t("statistics.categoryDistribution")}</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    dataKey="value"
                    nameKey="name"
                    shape={(props: PieSectorShapeProps, index: number) => (
                      <Sector
                        {...props}
                        fill={COLORS[index % COLORS.length]}
                      />
                    )}
                  />
                  <Tooltip
                    formatter={(value) => fmt(Number(value))}
                    contentStyle={{
                      backgroundColor: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius)",
                      color: "var(--popover-foreground)",
                    }}
                    itemStyle={{
                      color: "var(--popover-foreground)",
                    }}
                    labelStyle={{
                      color: "var(--foreground)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-center text-muted-foreground">
                {t("statistics.noData")}
              </p>
            )}
            {categoryData.length > 0 && (
              <ul className="mt-4 space-y-1.5">
                {categoryData.map((cat, i) => {
                  const total = categoryData.reduce((s, c) => s + c.value, 0);
                  const pct = total > 0 ? (cat.value / total) * 100 : 0;
                  return (
                    <li
                      key={cat.name}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                          aria-hidden="true"
                        />
                        <span className="text-foreground">{cat.name}</span>
                      </span>
                      <span className="text-muted-foreground font-variant-numeric tabular-nums">
                        {pct.toFixed(0)}% · {fmt(cat.value)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Top 5 Subscriptions — "which ones cost the most" */}
        <Card className="transition-shadow hover:shadow-ambient-low">
          <CardHeader>
            <CardTitle>{t("statistics.topSubscriptions")}</CardTitle>
          </CardHeader>
          <CardContent>
            {topSubs.length > 0 ? (
              <div className="flex flex-col gap-3">
                {topSubs.map((sub, i) => (
                  <div
                    key={sub.name}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/30 hover:shadow-ambient-low"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {i + 1}
                      </span>
                      <span className="font-medium">{sub.name}</span>
                    </div>
                    <span className="font-variant-numeric tabular-nums font-semibold">
                      {fmt(sub.cost)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-12 text-center text-muted-foreground">
                {t("statistics.noData")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
