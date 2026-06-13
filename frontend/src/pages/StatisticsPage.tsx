import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/auth-hook";
import { getStats, listSubscriptions } from "@/api/subscriptions";
import type { SubscriptionStats, Subscription } from "@/api/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Sector,
} from "recharts";
import type { PieSectorShapeProps, PieLabelRenderProps } from "recharts";

const COLORS = [
  "#6366f1",
  "#f43f5e",
  "#10b981",
  "#f59e0b",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#ef4444",
  "#84cc16",
];

interface CategoryData {
  name: string;
  value: number;
}

interface MonthlyData {
  month: string;
  amount: number;
}

interface TopSubData {
  name: string;
  cost: number;
}

export default function StatisticsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  const baseCurrency = stats?.base_currency ?? user?.base_currency ?? "CNY";
  const locale = i18n.language;

  const fetchData = useCallback(async () => {
    try {
      const [statsData, subsData] = await Promise.all([
        getStats(),
        listSubscriptions(),
      ]);
      setStats(statsData);
      setSubscriptions(subsData);
    } catch {
      // 401 handled by interceptor
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const hasData = subscriptions.length > 0;

  // Category distribution data
  const categoryData: CategoryData[] = stats
    ? Object.entries(stats.by_category).map(([name, value]) => ({
        name: name || t("statistics.category"),
        value,
      }))
    : [];

  // Monthly projection data
  const monthlyData: MonthlyData[] = computeMonthlyProjection(
    subscriptions,
    locale
  );

  // Top 5 subscriptions
  const topSubs: TopSubData[] = subscriptions
    .filter((s) => s.converted_price != null && s.status === "active")
    .sort((a, b) => (b.converted_price ?? 0) - (a.converted_price ?? 0))
    .slice(0, 5)
    .map((s) => ({ name: s.name, cost: s.converted_price ?? 0 }));

  const fmt = (value: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: baseCurrency,
    }).format(value);

  if (loading) {
    return (
      <p className="text-muted-foreground">{t("dashboard.loading")}</p>
    );
  }

  if (!hasData) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">{t("statistics.title")}</h2>
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

  const totalMonthly = stats?.total_monthly ?? 0;

  return (
    <div className="space-y-6 [&_.recharts-text]:fill-muted-foreground [&_.recharts-cartesian-grid-horizontal_line]:stroke-border/50 [&_.recharts-cartesian-grid-vertical_line]:stroke-border/50 [&_.recharts-pie-label-text]:fill-foreground">
      <h2 className="text-2xl font-bold">{t("statistics.title")}</h2>

      {/* Summary Metric Cards */}
      {stats && stats.count > 0 && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("statistics.avgMonthly")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{fmt(stats.avg_monthly)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("statistics.mostExpensive")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{fmt(stats.most_expensive?.amount ?? 0)}</p>
              <p className="text-sm text-muted-foreground">{stats.most_expensive?.name}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("statistics.cheapest")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{fmt(stats.cheapest?.amount ?? 0)}</p>
              <p className="text-sm text-muted-foreground">{stats.cheapest?.name}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("statistics.top3Percentage")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.top3_percentage.toFixed(1)}%</p>
              <p className="text-sm text-muted-foreground">{t("statistics.top3Subtitle")}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Category Distribution */}
        <Card>
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
                    label={(props: PieLabelRenderProps) => {
                      const name = (props.name as string) ?? "";
                      const percent = (props.percent as number) ?? 0;
                      return `${name} ${(percent * 100).toFixed(0)}%`;
                    }}
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
                      borderRadius: "8px",
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
              <p className="mt-2 text-center text-sm text-muted-foreground">
                {t("dashboard.monthlySpend")}: {fmt(totalMonthly)}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Top 5 Subscriptions */}
        <Card>
          <CardHeader>
            <CardTitle>{t("statistics.topSubscriptions")}</CardTitle>
          </CardHeader>
          <CardContent>
            {topSubs.length > 0 ? (
              <div className="flex flex-col gap-3">
                {topSubs.map((sub, i) => (
                  <div
                    key={sub.name}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {i + 1}
                      </span>
                      <span className="font-medium">{sub.name}</span>
                    </div>
                    <span className="font-semibold">{fmt(sub.cost)}</span>
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

      {/* Monthly Trend */}
      <Card>
        <CardHeader>
          <CardTitle>{t("statistics.monthlyTrend")}</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value) => fmt(Number(value))}
                  labelFormatter={(label) =>
                    `${t("statistics.month")}: ${label}`
                  }
                  contentStyle={{
                    backgroundColor: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    color: "var(--popover-foreground)",
                  }}
                  itemStyle={{
                    color: "var(--popover-foreground)",
                  }}
                  labelStyle={{
                    color: "var(--foreground)",
                  }}
                />
                <Bar
                  dataKey="amount"
                  fill="var(--primary)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-12 text-center text-muted-foreground">
              {t("statistics.noData")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Forward-project monthly spending for the next 12 months.
 * For each active subscription with a next_billing_date, determines which
 * of the next 12 months it will be billed in based on its cycle.
 */
function computeMonthlyProjection(
  subs: Subscription[],
  locale: string
): MonthlyData[] {
  const activeSubs = subs.filter(
    (s) =>
      s.status === "active" &&
      s.next_billing_date &&
      s.converted_price != null
  );
  if (activeSubs.length === 0) return [];

  const now = new Date();
  const months: Date[] = [];
  for (let i = 0; i < 12; i++) {
    months.push(new Date(now.getFullYear(), now.getMonth() + i, 1));
  }

  const result: MonthlyData[] = months.map((m) => ({
    month: m.toLocaleDateString(locale, { month: "short", year: "2-digit" }),
    amount: 0,
  }));

  for (const sub of activeSubs) {
    const billingStart = new Date(sub.next_billing_date! + "T00:00:00");
    const monthPrice = sub.converted_price!;

    for (let i = 0; i < 12; i++) {
      const monthStart = months[i];
      const monthEnd = new Date(
        monthStart.getFullYear(),
        monthStart.getMonth() + 1,
        0
      );

      if (
        hitsMonth(
          billingStart,
          sub.cycle_count,
          sub.cycle_unit,
          monthStart,
          monthEnd
        )
      ) {
        result[i].amount += monthPrice;
      }
    }
  }

  return result;
}

/**
 * Determine whether a subscription that started billing on `billingStart`
 * with the given cycle will have a billing event within [monthStart, monthEnd].
 */
function hitsMonth(
  billingStart: Date,
  cycleCount: number,
  cycleUnit: string,
  monthStart: Date,
  monthEnd: Date
): boolean {
  let cursor = new Date(billingStart);

  if (cursor > monthEnd) return false;

  if (cursor < monthStart) {
    cursor = jumpClosest(billingStart, monthStart, cycleCount, cycleUnit);
  }

  let checkDate = new Date(cursor);
  while (checkDate <= monthEnd) {
    if (checkDate >= monthStart && checkDate <= monthEnd) {
      return true;
    }
    checkDate = addCycle(checkDate, cycleCount, cycleUnit);
    if (
      checkDate >
      new Date(
        monthEnd.getFullYear() + 2,
        monthEnd.getMonth(),
        monthEnd.getDate()
      )
    ) {
      break;
    }
  }

  return false;
}

function jumpClosest(
  origin: Date,
  target: Date,
  cycleCount: number,
  cycleUnit: string
): Date {
  let cursor = new Date(origin);
  const maxIter = 200;
  for (let i = 0; i < maxIter; i++) {
    const next = addCycle(cursor, cycleCount, cycleUnit);
    if (next > target) return cursor;
    cursor = next;
  }
  return cursor;
}

function addCycle(date: Date, count: number, unit: string): Date {
  const d = new Date(date);
  switch (unit) {
    case "day":
      d.setDate(d.getDate() + count);
      break;
    case "week":
      d.setDate(d.getDate() + 7 * count);
      break;
    case "month":
      d.setMonth(d.getMonth() + count);
      break;
    case "year":
      d.setFullYear(d.getFullYear() + count);
      break;
  }
  return d;
}
