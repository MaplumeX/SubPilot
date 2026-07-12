import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { getStats, getForecast, acknowledgeSubscription } from "@/api/subscriptions";
import type { SubscriptionStats, Subscription, SubscriptionForecast } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ShieldCheck, BellRing, CheckCircle2 } from "lucide-react";
import { toast } from "@/components/ui/toast-store";
import { formatDueLabel } from "@/lib/due";
import { cn, isNonAuthError } from "@/lib/utils";

interface DashboardPageProps {
  onAddSubscription: () => void;
  reminderDays: number;
}

/** Count-up a number toward `target` over ~600ms, reduced-motion aware. */
function useCountUp(target: number) {
  const [value, setValue] = useState(0);
  const frame = useRef<number | null>(null);
  const reduce = useRef(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
  }, []);
  useEffect(() => {
    if (reduce.current) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const from = 0;
    const dur = 600;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      // ease-out-quart
      const eased = 1 - Math.pow(1 - p, 4);
      setValue(from + (target - from) * eased);
      if (p < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [target]);
  return value;
}

function HeroNumber({
  value,
  fmt,
  className,
}: {
  value: number;
  fmt: (n: number) => string;
  className?: string;
}) {
  const animated = useCountUp(value);
  return (
    <p
      className={cn(
        "font-bold font-variant-numeric tabular-nums tracking-[-0.02em]",
        className
      )}
    >
      {fmt(animated)}
    </p>
  );
}

export default function DashboardPage({
  onAddSubscription,
  reminderDays,
}: DashboardPageProps) {
  const { t, i18n } = useTranslation();
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [forecast, setForecast] = useState<SubscriptionForecast | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [statsData, forecastData] = await Promise.all([
        getStats(),
        getForecast(),
      ]);
      setStats(statsData);
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

  const locale = i18n.language;
  const baseCurrency = forecast?.base_currency ?? stats?.base_currency ?? "CNY";
  const fmt = (value: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: baseCurrency,
      maximumFractionDigits: value < 100 ? 2 : 0,
    }).format(value);

  const handleAcknowledge = async (sub: Subscription) => {
    try {
      await acknowledgeSubscription(sub.id);
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
        message: t("dashboard.acknowledgedMessage"),
      });
    } catch (err) {
      // 401 handled by interceptor; surface all other failures.
      if (isNonAuthError(err)) {
        toast({ title: t("errors.loadFailed"), variant: "destructive" });
      }
    }
  };

  const dueSoon = stats?.due_soon ?? [];
  const isAllClear = !loading && dueSoon.length === 0;
  const monthlySpend = stats?.total_monthly ?? 0;
  const next30Days = forecast?.next_30_days_total ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-bold leading-tight tracking-[-0.01em]">
            {t("dashboard.title")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {!loading &&
              (dueSoon.length > 0
                ? t("dashboard.subtitleDue", { count: dueSoon.length })
                : t("dashboard.subtitleClear", { days: reminderDays }))}
          </p>
        </div>
        <Button onClick={onAddSubscription}>{t("dashboard.addSubscription")}</Button>
      </div>

      {loading ? (
        <div className="space-y-6" role="status" aria-live="polite">
          <div className="h-32 rounded-xl bg-muted/40 animate-pulse" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Due Soon — first visual focus (PRODUCT.md principle 1).
              ring-pending/30 (up from /20) + bg-pending/[0.03] tint gives it
              real visual priority over the stat cards without raising volume. */}
          {dueSoon.length > 0 ? (
            <Card className="ring-2 ring-pending/30 bg-pending/[0.03] transition-shadow hover:shadow-ambient-low">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-pending">
                  <BellRing className="size-4" />
                  {t("dashboard.dueSoon")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2" role="list">
                  {dueSoon.map((sub) => (
                    <li
                      key={sub.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-pending/10 bg-background/60 p-3 transition-colors hover:border-pending/20"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="size-7 shrink-0 rounded-md after:rounded-md">
                          <AvatarImage src={sub.logo_url ?? undefined} alt={sub.name} className="rounded-md object-contain" />
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
                          variant="outline"
                          size="sm"
                          onClick={() => void handleAcknowledge(sub)}
                        >
                          <CheckCircle2 className="size-4 text-pending" />
                          {t("subscriptions.acknowledge")}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : (
            isAllClear && (
              <Card className="ring-foreground/10 transition-shadow hover:shadow-ambient-low">
                <CardContent className="flex items-center gap-5 py-10">
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-pending/10">
                    <ShieldCheck className="size-7 text-pending" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-heading text-xl font-semibold">
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

          {/* Monthly Spend hero — one dominant number, breaking the 3-equal-card grid.
              Yearly + Active become secondary supports. */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="transition-shadow hover:shadow-ambient-low">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("dashboard.monthlySpend")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <HeroNumber value={monthlySpend} fmt={fmt} className="text-4xl" />
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("dashboard.yearlySpend")}: {fmt(stats?.total_yearly ?? 0)}
                </p>
              </CardContent>
            </Card>
            <Card className="transition-shadow hover:shadow-ambient-low">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("dashboard.activeSubscriptions")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <HeroNumber
                  value={stats?.count ?? 0}
                  fmt={(n) => String(Math.round(n))}
                  className="text-3xl"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("dashboard.activeSubscriptionsHint")}
                </p>
              </CardContent>
            </Card>
            <Card className="transition-shadow hover:shadow-ambient-low">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("dashboard.yearlySpend")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <HeroNumber
                  value={stats?.total_yearly ?? 0}
                  fmt={fmt}
                  className="text-3xl"
                />
              </CardContent>
            </Card>
          </div>

          {/* Next 30 days cashflow — same algorithm as Statistics forecast */}
          {forecast && (
            <Card className="transition-shadow hover:shadow-ambient-low">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("dashboard.nextMonthProjection")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <HeroNumber value={next30Days} fmt={fmt} className="text-3xl" />
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("dashboard.nextMonthProjectionSubtitle")}
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
