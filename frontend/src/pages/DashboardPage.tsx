import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { getStats } from "@/api/subscriptions";
import type { SubscriptionStats } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DashboardPageProps {
  onAddSubscription: () => void;
}

export default function DashboardPage({ onAddSubscription }: DashboardPageProps) {
  const { t, i18n } = useTranslation();
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const data = await getStats();
      setStats(data);
    } catch {
      // 401 handled by interceptor
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const chartData = generateChartData(stats, i18n.language);
  const locale = i18n.language;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t("dashboard.title")}</h2>
        <Button onClick={onAddSubscription}>{t("dashboard.addSubscription")}</Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">{t("dashboard.loading")}</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("dashboard.monthlySpend")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {new Intl.NumberFormat(locale, { style: "currency", currency: stats?.base_currency ?? "CNY" }).format(stats?.total_monthly ?? 0)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("dashboard.yearlySpend")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {new Intl.NumberFormat(locale, { style: "currency", currency: stats?.base_currency ?? "CNY" }).format(stats?.total_yearly ?? 0)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("dashboard.activeSubscriptions")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stats?.count ?? 0}</p>
              </CardContent>
            </Card>
          </div>

          {stats && stats.due_soon.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("dashboard.dueSoon")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  {stats.due_soon.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="size-7">
                          <AvatarImage src={sub.logo_url ?? undefined} alt={sub.name} />
                          <AvatarFallback>{sub.name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{sub.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {sub.next_billing_date}
                          </p>
                        </div>
                      </div>
                      <Badge variant="destructive">{t("dashboard.dueSoon")}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.monthlyTrend")}</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke="var(--primary)"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground">
                  {t("dashboard.emptyTrend")}
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function generateChartData(stats: SubscriptionStats | null, locale: string) {
  if (!stats || stats.count === 0) return [];

  const months: { month: string; amount: number }[] = [];
  const today = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const label = d.toLocaleDateString(locale, {
      month: "short",
      year: "2-digit",
    });
    months.push({ month: label, amount: stats.total_monthly });
  }
  return months;
}
