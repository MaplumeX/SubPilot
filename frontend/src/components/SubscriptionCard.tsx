import { useTranslation } from "react-i18next";
import { RefreshCw, CheckCircle2 } from "lucide-react";
import type { Subscription, CycleUnit } from "@/api/types";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface SubscriptionCardProps {
  subscription: Subscription;
  baseCurrency: string;
  locale: string;
  onEdit: (sub: Subscription) => void;
  onDelete: (id: number) => void | Promise<void>;
  onAcknowledge?: (id: number) => void | Promise<void>;
  isDueSoon: (sub: Subscription) => boolean;
  formatCycle: (count: number, unit: CycleUnit) => string;
}

export default function SubscriptionCard({
  subscription: sub,
  baseCurrency,
  locale,
  onEdit,
  onDelete,
  onAcknowledge,
  isDueSoon,
  formatCycle,
}: SubscriptionCardProps) {
  const { t } = useTranslation();

  const dueSoon = isDueSoon(sub);
  const acknowledged =
    sub.acknowledged_billing_date != null &&
    sub.acknowledged_billing_date === sub.next_billing_date;
  const canAcknowledge = dueSoon && !acknowledged;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="size-8 shrink-0">
              <AvatarImage src={sub.logo_url ?? undefined} alt={sub.name} />
              <AvatarFallback>{sub.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <CardTitle className="truncate text-sm">{sub.name}</CardTitle>
          </div>
          <div className="flex shrink-0 gap-1">
            {isDueSoon(sub) && (
              <Badge variant={acknowledged ? "secondary" : "destructive"}>
                {acknowledged ? t("subscriptions.acknowledged") : t("dashboard.dueSoon")}
              </Badge>
            )}
            <Badge
              variant={
                sub.status === "active"
                  ? "default"
                  : sub.status === "trial"
                    ? "secondary"
                    : "outline"
              }
            >
              {t(`subscriptions.statuses.${sub.status}`)}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-1.5">
        <div className="text-lg font-semibold">
          {sub.currency} {sub.price.toFixed(2)}
          {sub.converted_price != null && sub.currency !== baseCurrency && (
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              (~{new Intl.NumberFormat(locale, { style: "currency", currency: baseCurrency }).format(sub.converted_price)})
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {sub.category && <span>{sub.category.name}</span>}
          {sub.payment_method && <span>{sub.payment_method.name}</span>}
          <span>{formatCycle(sub.cycle_count, sub.cycle_unit)}</span>
          <span
            title={sub.auto_renew ? t("subscriptions.auto_renew_enabled") : t("subscriptions.auto_renew_disabled")}
            className="inline-flex items-center"
          >
            <RefreshCw className={`size-3 ${sub.auto_renew ? "text-primary" : "text-muted-foreground/40"}`} />
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          {sub.next_billing_date ?? "-"}
        </div>
      </CardContent>

      <CardFooter className="gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(sub)}>
          {t("subscriptions.edit")}
        </Button>
        <Button variant="destructive" size="sm" className="flex-1" onClick={() => onDelete(sub.id)}>
          {t("subscriptions.delete")}
        </Button>
        {canAcknowledge && onAcknowledge && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onAcknowledge(sub.id)}
          >
            <CheckCircle2 className="size-4" />
            {t("subscriptions.acknowledge")}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
