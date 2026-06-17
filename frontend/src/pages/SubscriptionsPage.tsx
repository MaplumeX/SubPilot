import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp, RefreshCw, LayoutGrid, List } from "lucide-react";
import {
  listSubscriptions,
  deleteSubscription,
  acknowledgeSubscription,
  createSubscription,
  updateSubscription,
  listCategories,
  getStats,
} from "@/api/subscriptions";
import { getNotificationSettings } from "@/api/notifications";
import type { Subscription, SubscriptionCreate, SubscriptionUpdate, CycleUnit } from "@/api/types";
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
import SubscriptionCard from "@/components/SubscriptionCard";

type ViewMode = "table" | "card";

function getInitialViewMode(): ViewMode {
  try {
    const stored = sessionStorage.getItem("subscription-view-mode");
    if (stored === "card" || stored === "table") return stored;
  } catch {
    // sessionStorage unavailable
  }
  return "table";
}

const STATUSES = ["active", "cancelled", "trial"] as const;

function SortableHeader({
  field,
  label,
  activeSort,
  order,
  onSort,
}: {
  field: string;
  label: string;
  activeSort: string;
  order: string;
  onSort: (field: string) => void;
}) {
  const isActive = activeSort === field;
  return (
    <TableHead
      className="cursor-pointer select-none"
      aria-sort={isActive ? (order === "asc" ? "ascending" : "descending") : undefined}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive && (
          order === "asc" ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />
        )}
      </div>
    </TableHead>
  );
}

export default function SubscriptionsPage() {
  const { t, i18n } = useTranslation();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [baseCurrency, setBaseCurrency] = useState<string>("CNY");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<string>("asc");
  const [viewMode, setViewMode] = useState<ViewMode>(getInitialViewMode);
  const [reminderDays, setReminderDays] = useState<number>(3);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    try {
      sessionStorage.setItem("subscription-view-mode", mode);
    } catch {
      // sessionStorage unavailable
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await listCategories();
      setCategories(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    getNotificationSettings()
      .then((s) => setReminderDays(s.reminder_days))
      .catch(() => {
        // 401 handled by interceptor; default reminderDays stays at 3
      });
  }, [fetchCategories]);

  const fetchSubscriptions = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (filterCategory) params.category = filterCategory;
      if (filterStatus) params.status = filterStatus;
      if (sortBy) {
        params.sort_by = sortBy;
        params.sort_order = sortOrder;
      }
      const data = await listSubscriptions(params);
      setSubscriptions(data);
      const stats = await getStats();
      setBaseCurrency(stats.base_currency);
    } catch {
      // 401 handled by interceptor
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterStatus, sortBy, sortOrder]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const reload = useCallback(() => {
    fetchSubscriptions();
    fetchCategories();
  }, [fetchSubscriptions, fetchCategories]);

  const handleCreate = async (data: SubscriptionCreate) => {
    await createSubscription(data);
    setFormOpen(false);
    reload();
  };

  const handleUpdate = async (data: SubscriptionCreate) => {
    if (!editing) return;
    await updateSubscription(editing.id, data as SubscriptionUpdate);
    setEditing(null);
    setFormOpen(false);
    reload();
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t("subscriptions.confirmDelete"))) {
      return;
    }
    await deleteSubscription(id);
    reload();
  };

  const handleAcknowledge = async (id: number) => {
    try {
      const updated = await acknowledgeSubscription(id);
      setSubscriptions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, acknowledged_billing_date: updated.acknowledged_billing_date } : s))
      );
    } catch {
      // 401 handled by interceptor
    }
  };

  const isDueSoon = (sub: Subscription) => {
    if (!sub.next_billing_date) return false;
    const next = new Date(sub.next_billing_date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const deadline = new Date();
    deadline.setDate(now.getDate() + reminderDays);
    deadline.setHours(0, 0, 0, 0);
    return next >= now && next <= deadline;
  };

  const formatCycle = (cycle_count: number, cycle_unit: CycleUnit) => {
    if (cycle_count === 1) {
      return t(`subscriptions.cycle_single.${cycle_unit}`);
    }
    return t(`subscriptions.cycle_multi`, { count: cycle_count, unit: t(`subscriptions.cycle_units.${cycle_unit}`) });
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
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

      <div className="flex items-center gap-4">
        <Select value={filterCategory || null} onValueChange={(v) => setFilterCategory(v === "__all__" ? "" : (v ?? ""))}>
          <SelectTrigger className="w-[160px]">
            <SelectValue label={filterCategory || undefined} placeholder={t("subscriptions.allCategories")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("subscriptions.allCategories")}</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus || null} onValueChange={(v) => setFilterStatus(v === "__all__" ? "" : (v ?? ""))}>
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

        <div className="ml-auto flex gap-1">
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="icon-sm"
            onClick={() => handleViewModeChange("table")}
            aria-label={t("subscriptions.viewTable")}
          >
            <List className="size-4" />
          </Button>
          <Button
            variant={viewMode === "card" ? "default" : "outline"}
            size="icon-sm"
            onClick={() => handleViewModeChange("card")}
            aria-label={t("subscriptions.viewCard")}
          >
            <LayoutGrid className="size-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">{t("subscriptions.loading")}</p>
      ) : subscriptions.length === 0 ? (
        <p className="text-muted-foreground">{t("subscriptions.noSubscriptions")}</p>
      ) : viewMode === "card" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {subscriptions.map((sub) => (
            <SubscriptionCard
              key={sub.id}
              subscription={sub}
              baseCurrency={baseCurrency}
              locale={i18n.language}
              onEdit={(s) => { setEditing(s); setFormOpen(true); }}
              onDelete={handleDelete}
              onAcknowledge={handleAcknowledge}
              isDueSoon={isDueSoon}
              formatCycle={formatCycle}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader field="name" label={t("subscriptions.name")} activeSort={sortBy} order={sortOrder} onSort={handleSort} />
                <SortableHeader field="converted_price" label={t("subscriptions.price")} activeSort={sortBy} order={sortOrder} onSort={handleSort} />
                <TableHead>{t("subscriptions.cycle")}</TableHead>
                <TableHead>{t("subscriptions.category")}</TableHead>
                <TableHead>{t("subscriptions.status")}</TableHead>
                <TableHead>{t("subscriptions.auto_renew")}</TableHead>
                <SortableHeader field="next_billing_date" label={t("subscriptions.nextBilling")} activeSort={sortBy} order={sortOrder} onSort={handleSort} />
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
                    {sub.converted_price != null && sub.currency !== baseCurrency && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        (~{new Intl.NumberFormat(i18n.language, { style: "currency", currency: baseCurrency }).format(sub.converted_price)})
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{formatCycle(sub.cycle_count, sub.cycle_unit)}</TableCell>
                  <TableCell>
                    {sub.category || "-"}
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
                  <TableCell>
                    <span
                      title={sub.auto_renew ? t("subscriptions.auto_renew_enabled") : t("subscriptions.auto_renew_disabled")}
                      className="inline-flex items-center"
                    >
                      <RefreshCw
                        className={`size-4 ${sub.auto_renew ? "text-primary" : "text-muted-foreground/40"}`}
                      />
                    </span>
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
                      {isDueSoon(sub) &&
                        !(sub.acknowledged_billing_date != null && sub.acknowledged_billing_date === sub.next_billing_date) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAcknowledge(sub.id)}
                          >
                            {t("subscriptions.acknowledge")}
                          </Button>
                        )}
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
