import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { getStats, listSubscriptions, acknowledgeSubscription } from "@/api/subscriptions";
import type { SubscriptionStats, Subscription } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ShieldCheck, BellRing } from "lucide-react";
import { toast } from "@/components/ui/toaster";
import { formatDueLabel } from "@/lib/due";

interface DashboardPageProps {
  onAddSubscription: () => void;
  reminderDays: number;
}

export default function DashboardPage({
  onAddSubscription,
  reminderDays,
}: DashboardPageProps) {
  const { t, i18n } = useTranslation();
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

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

  const locale = i18n.language;
  const baseCurrency = stats?.base_currency ?? "CNY";
  const fmt = (value: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: baseCurrency,
    }).format(value);

  const handleAcknowledge = async (sub: Subscription) => {
    try {
      const updated = await acknowledgeSubscription(sub.id);
      setStats((prev) =>
        prev
          ? {
              ...prev,
              due_soon: prev.due_soon.filter((s) => s.id !== sub.id),
            }
          : prev
      );
      toast({
        title: t("dashboard.acknowledgedTitle"),
        message: t("dashboard.acknowledgedMessage", {
          date: updated.next_billing_date ?? "-",
        }),
      });
    } catch {
      // 401 handled by interceptor
    }
  };

  const dueSoon = stats?.due_soon ?? [];
  const isAllClear = !loading && dueSoon.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-[clamp(1.5rem,3vw,2rem)] font-bold leading-tight tracking-[-0.01em]">
          {t("dashboard.title")}
        </h2>
        <Button onClick={onAddSubscription}>{t("dashboard.addSubscription")}</Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground" role="status" aria-live="polite">
          {t("dashboard.loading")}
        </p>
      ) : (
        <>
          {/* Due Soon — first visual focus (PRODUCT.md principle 1) */}
          {dueSoon.length > 0 ? (
            <Card className="ring-pending/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BellRing className="size-4 text-pending" />
                  {t("dashboard.dueSoon")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  {dueSoon.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between gap-3 rounded-lg border p-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="size-7 shrink-0">
                          <AvatarImage src={sub.logo_url ?? undefined} alt={sub.name} />
                          <AvatarFallback>{sub.name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{sub.name}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="font-variant-numeric tabular-nums font-semibold">
                          {sub.currency} {sub.price.toFixed(2)}
                        </span>
                        <Badge variant="pending">
                          {formatDueLabel(sub.next_billing_date, t)}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleAcknowledge(sub)}
                        >
                          {t("subscriptions.acknowledge")}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            isAllClear && (
              <Card className="ring-foreground/10">
                <CardContent className="flex items-center gap-4 py-8">
                  <ShieldCheck className="size-10 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="font-heading text-lg font-semibold">
                      {t("dashboard.allClear")}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("dashboard.allClearSubtitle", { days: reminderDays })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          )}

          {/* Monthly / Yearly / Active — secondary, below the primary focus */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("dashboard.monthlySpend")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold font-variant-numeric tabular-nums">
                  {fmt(stats?.total_monthly ?? 0)}
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
                <p className="text-2xl font-bold font-variant-numeric tabular-nums">
                  {fmt(stats?.total_yearly ?? 0)}
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
                <p className="text-2xl font-bold font-variant-numeric tabular-nums">
                  {stats?.count ?? 0}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Next-month projection — replaces fake trend chart (distill) */}
          <NextMonthProjection
            subscriptions={subscriptions}
            fmt={fmt}
          />
        </>
      )}
    </div>
  );
}

/**
 * A single, honest number: projected spend for the next 30 days,
 * derived from active subscriptions whose next_billing_date falls in that window.
 * Replaces the misleading 12-month flat-line trend that used total_monthly x12.
 */
function NextMonthProjection({
  subscriptions,
  fmt,
}: {
  subscriptions: Subscription[];
  fmt: (v: number) => string;
}) {
  const { t } = useTranslation();

  const [projection, setProjection] = useState<number | null>(null);

  useEffect(() => {
    if (subscriptions.length === 0) {
      setProjection(null);
      return;
    }
    const now = new Date();
    const windowEnd = new Date(now);
    windowEnd.setDate(now.getDate() + 30);

    const total = subscriptions
      .filter((s) => s.status === "active" && s.converted_price != null && s.next_billing_date)
      .filter((s) => {
        const next = new Date(s.next_billing_date! + "T00:00:00");
        return next >= now && next <= windowEnd;
      })
      .reduce((sum, s) => sum + (s.converted_price ?? 0), 0);

    setProjection(total);
  }, [subscriptions]);

  if (projection == null) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t("dashboard.nextMonthProjection")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold font-variant-numeric tabular-nums">
          {fmt(projection)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("dashboard.nextMonthProjectionSubtitle")}
        </p>
      </CardContent>
    </Card>
  );
}