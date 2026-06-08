import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  listSubscriptions,
  deleteSubscription,
  createSubscription,
  updateSubscription,
} from "@/api/subscriptions";
import type { Subscription, SubscriptionCreate, SubscriptionUpdate } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SubscriptionForm from "@/components/SubscriptionForm";

const CATEGORIES = [
  "streaming",
  "software",
  "cloud",
  "fitness",
  "music",
  "gaming",
  "news",
  "productivity",
  "other",
] as const;

const STATUSES = ["active", "cancelled", "trial"] as const;
const CYCLES = ["weekly", "monthly", "quarterly", "yearly"] as const;

export default function SubscriptionsPage() {
  const { t } = useTranslation();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterCycle, setFilterCycle] = useState<string>("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);

  const fetchSubscriptions = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (filterCategory) params.category = filterCategory;
      if (filterStatus) params.status = filterStatus;
      if (filterCycle) params.billing_cycle = filterCycle;
      const data = await listSubscriptions(params);
      setSubscriptions(data);
    } catch {
      // 401 handled by interceptor
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterStatus, filterCycle]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const handleCreate = async (data: SubscriptionCreate) => {
    await createSubscription(data);
    setFormOpen(false);
    fetchSubscriptions();
  };

  const handleUpdate = async (data: SubscriptionCreate) => {
    if (!editing) return;
    await updateSubscription(editing.id, data as SubscriptionUpdate);
    setEditing(null);
    setFormOpen(false);
    fetchSubscriptions();
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t("subscriptions.confirmDelete"))) {
      return;
    }
    await deleteSubscription(id);
    fetchSubscriptions();
  };

  const isDueSoon = (sub: Subscription) => {
    if (!sub.next_billing_date) return false;
    const next = new Date(sub.next_billing_date);
    const now = new Date();
    const threeDays = new Date();
    threeDays.setDate(now.getDate() + 3);
    return next >= now && next <= threeDays;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t("subscriptions.title")}</h2>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          {t("subscriptions.addSubscription")}
        </Button>
      </div>

      <div className="flex gap-4">
        <Select value={filterCategory || undefined} onValueChange={(v) => setFilterCategory(v === "__all__" ? "" : (v ?? ""))}>
          <SelectTrigger className="w-[160px]">
            <SelectValue label={filterCategory ? t(`subscriptions.categories.${filterCategory}`) : undefined} placeholder={t("subscriptions.allCategories")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("subscriptions.allCategories")}</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {t(`subscriptions.categories.${cat}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus || undefined} onValueChange={(v) => setFilterStatus(v === "__all__" ? "" : (v ?? ""))}>
          <SelectTrigger className="w-[160px]">
            <SelectValue label={filterStatus ? t(`subscriptions.statuses.${filterStatus}`) : undefined} placeholder={t("subscriptions.allStatuses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("subscriptions.allStatuses")}</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`subscriptions.statuses.${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterCycle || undefined} onValueChange={(v) => setFilterCycle(v === "__all__" ? "" : (v ?? ""))}>
          <SelectTrigger className="w-[160px]">
            <SelectValue label={filterCycle ? t(`subscriptions.cycles.${filterCycle}`) : undefined} placeholder={t("subscriptions.allCycles")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("subscriptions.allCycles")}</SelectItem>
            {CYCLES.map((c) => (
              <SelectItem key={c} value={c}>
                {t(`subscriptions.cycles.${c}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-muted-foreground">{t("subscriptions.loading")}</p>
      ) : subscriptions.length === 0 ? (
        <p className="text-muted-foreground">{t("subscriptions.noSubscriptions")}</p>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("subscriptions.name")}</TableHead>
                <TableHead>{t("subscriptions.price")}</TableHead>
                <TableHead>{t("subscriptions.cycle")}</TableHead>
                <TableHead>{t("subscriptions.category")}</TableHead>
                <TableHead>{t("subscriptions.status")}</TableHead>
                <TableHead>{t("subscriptions.nextBilling")}</TableHead>
                <TableHead className="text-right">{t("subscriptions.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-7">
                        <AvatarImage src={sub.logo_url ?? undefined} alt={sub.name} />
                        <AvatarFallback>{sub.name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span>{sub.name}</span>
                      {isDueSoon(sub) && (
                        <Badge variant="destructive" className="ml-2">
                          {t("dashboard.dueSoon")}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {sub.currency} {sub.price.toFixed(2)}
                  </TableCell>
                  <TableCell>{t(`subscriptions.cycles.${sub.billing_cycle}`)}</TableCell>
                  <TableCell>
                    {sub.category ? t(`subscriptions.categories.${sub.category}`) : "-"}
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell>{sub.next_billing_date ?? "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditing(sub);
                          setFormOpen(true);
                        }}
                      >
                        {t("subscriptions.edit")}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(sub.id)}
                      >
                        {t("subscriptions.delete")}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <SubscriptionForm
        key={editing?.id ?? "create"}
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
        subscription={editing}
        onSubmit={editing ? handleUpdate : handleCreate}
      />
    </div>
  );
}
