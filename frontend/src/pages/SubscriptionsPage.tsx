import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp, RefreshCw, LayoutGrid, List, Trash2, CheckCircle2 } from "lucide-react";
import {
  listSubscriptions,
  deleteSubscription,
  acknowledgeSubscription,
  unacknowledgeSubscription,
  createSubscription,
  updateSubscription,
  getStats,
} from "@/api/subscriptions";
import { listCategories as listCategoryEntities } from "@/api/categories";
import { getNotificationSettings } from "@/api/notifications";
import type { Category, Subscription, SubscriptionCreate, SubscriptionUpdate, CycleUnit } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import ConfirmDialog from "@/components/ConfirmDialog";
import { toast } from "@/components/ui/toast-store";
import { formatDueLabel, formatNextBillingDate, isDueWithin, effectiveDaysFor } from "@/lib/due";
import { formatCurrency } from "@/lib/currencies";
import { isNonAuthError, toastError } from "@/lib/utils";

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
const SORTABLE_FIELDS = ["name", "converted_price", "next_billing_date"] as const;
const SORT_STORAGE_KEY = "subscription-sort";

function getInitialSortState(): { field: string; order: string } {
  try {
    const raw = localStorage.getItem(SORT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed.field === "string" &&
        SORTABLE_FIELDS.includes(parsed.field as (typeof SORTABLE_FIELDS)[number]) &&
        (parsed.order === "asc" || parsed.order === "desc")
      ) {
        return { field: parsed.field, order: parsed.order };
      }
    }
  } catch {
    // localStorage unavailable or invalid JSON
  }
  return { field: "", order: "asc" };
}

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
      className="select-none p-0"
      aria-sort={isActive ? (order === "asc" ? "ascending" : "descending") : undefined}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className="flex w-full items-center gap-1 px-2 py-2 text-left font-medium text-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 rounded-sm"
      >
        {label}
        {isActive && (
          order === "asc" ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />
        )}
      </button>
    </TableHead>
  );
}

export default function SubscriptionsPage() {
  const { t, i18n } = useTranslation();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [baseCurrency, setBaseCurrency] = useState<string>("CNY");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sortBy, setSortBy] = useState<string>(() => getInitialSortState().field);
  const [sortOrder, setSortOrder] = useState<string>(() => getInitialSortState().order);
  const [viewMode, setViewMode] = useState<ViewMode>(getInitialViewMode);
  const [reminderDays, setReminderDays] = useState<number>(3);
  const [deleteTarget, setDeleteTarget] = useState<Subscription | null>(null);

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
      const data = await listCategoryEntities();
      setCategories(data);
    } catch (err) {
      if (isNonAuthError(err)) {
        toastError(err, t);
      }
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    getNotificationSettings()
      .then((s) => setReminderDays(s.reminder_days))
      .catch((err) => {
        // 401 handled by interceptor; default reminderDays stays at 3.
        if (isNonAuthError(err)) {
          toastError(err, t);
        }
      });
  }, [fetchCategories]);

  const fetchSubscriptions = useCallback(async () => {
    try {
      const params: Record<string, string | number> = {};
      if (filterCategory != null) params.category = filterCategory;
      if (filterStatus) params.status = filterStatus;
      if (sortBy) {
        params.sort_by = sortBy;
        params.sort_order = sortOrder;
      }
      const data = await listSubscriptions(params);
      setSubscriptions(data);
      const stats = await getStats();
      setBaseCurrency(stats.base_currency);
    } catch (err) {
      // 401 handled by interceptor; surface all other failures.
      if (isNonAuthError(err)) {
        toastError(err, t);
      }
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
    await deleteSubscription(id);
    reload();
  };

  const handleAcknowledge = async (id: number) => {
    try {
      const updated = await acknowledgeSubscription(id);
      setSubscriptions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, acknowledged_billing_date: updated.acknowledged_billing_date, next_billing_date: updated.next_billing_date } : s))
      );
      toast({
        title: t("dashboard.acknowledgedTitle"),
        message: t("dashboard.acknowledgedMessage"),
        action: {
          label: t("dashboard.acknowledgedAction"),
          onClick: () => void handleUndoAcknowledge(id),
        },
      });
    } catch (err) {
      // 401 handled by interceptor; surface all other failures.
      if (isNonAuthError(err)) {
        toastError(err, t);
      }
    }
  };

  const handleUndoAcknowledge = async (id: number) => {
    try {
      await unacknowledgeSubscription(id);
      setSubscriptions((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, acknowledged_billing_date: null }
            : s
        )
      );
      toast({ title: t("dashboard.undoneTitle") });
    } catch (err) {
      if (isNonAuthError(err)) {
        toastError(err, t);
      }
    }
  };

  const isDueSoon = (sub: Subscription) => isDueWithin(sub.next_billing_date, effectiveDaysFor(sub, reminderDays));

  const formatCycle = (cycle_count: number, cycle_unit: CycleUnit) => {
    if (cycle_count === 1) {
      return t(`subscriptions.cycle_single.${cycle_unit}`);
    }
    return t(`subscriptions.cycle_multi`, { count: cycle_count, unit: t(`subscriptions.cycle_units.${cycle_unit}`) });
  };

  const handleSort = (field: string) => {
    let newSortBy: string;
    let newSortOrder: string;
    if (sortBy === field) {
      newSortBy = sortBy;
      newSortOrder = sortOrder === "asc" ? "desc" : "asc";
    } else {
      newSortBy = field;
      newSortOrder = "asc";
    }
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    try {
      localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify({ field: newSortBy, order: newSortOrder }));
    } catch {
      // localStorage unavailable
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-bold leading-tight tracking-[-0.01em]">{t("subscriptions.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("subscriptions.subtitle")}</p>
        </div>
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
        <Select value={filterCategory != null ? String(filterCategory) : "__all__"} onValueChange={(v) => setFilterCategory(v === "__all__" ? null : Number(v))}>
          <SelectTrigger className="w-[160px]">
            <SelectValue label={filterCategory != null ? categories.find((c) => c.id === filterCategory)?.name : t("subscriptions.allCategories")} placeholder={t("subscriptions.allCategories")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("subscriptions.allCategories")}</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={String(cat.id)}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus || "__all__"} onValueChange={(v) => setFilterStatus(v === "__all__" ? "" : (v ?? ""))}>
          <SelectTrigger className="w-[160px]">
            <SelectValue label={filterStatus ? t(`subscriptions.statuses.${filterStatus}`) : t("subscriptions.allStatuses")} placeholder={t("subscriptions.allStatuses")} />
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
        <div className="space-y-2" role="status" aria-live="polite">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 rounded-md bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : subscriptions.length === 0 ? (
        <Card className="ring-foreground/10">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <LayoutGrid className="size-6 text-muted-foreground" aria-hidden="true" />
            </div>
            <p className="font-medium">{t("subscriptions.noSubscriptions")}</p>
            <p className="text-sm text-muted-foreground">{t("subscriptions.noSubscriptionsHint")}</p>
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              {t("subscriptions.addSubscription")}
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === "card" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {subscriptions.map((sub) => (
            <SubscriptionCard
              key={sub.id}
              subscription={sub}
              baseCurrency={baseCurrency}
              locale={i18n.language}
              onEdit={(s) => { setEditing(s); setFormOpen(true); }}
              onDelete={(sub) => setDeleteTarget(sub)}
              onAcknowledge={handleAcknowledge}
              isDueSoon={isDueSoon}
              formatCycle={formatCycle}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <SortableHeader field="name" label={t("subscriptions.name")} activeSort={sortBy} order={sortOrder} onSort={handleSort} />
                <SortableHeader field="converted_price" label={t("subscriptions.price")} activeSort={sortBy} order={sortOrder} onSort={handleSort} />
                <TableHead>{t("subscriptions.cycle")}</TableHead>
                <TableHead>{t("subscriptions.category")}</TableHead>
                <TableHead>{t("subscriptions.paymentMethod")}</TableHead>
                <TableHead>{t("subscriptions.status")}</TableHead>
                <TableHead>{t("subscriptions.auto_renew")}</TableHead>
                <SortableHeader field="next_billing_date" label={t("subscriptions.nextBilling")} activeSort={sortBy} order={sortOrder} onSort={handleSort} />
                <TableHead className="text-right">{t("subscriptions.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.map((sub) => {
                const dueSoon = isDueSoon(sub);
                const acknowledged =
                  sub.acknowledged_billing_date != null &&
                  sub.acknowledged_billing_date === sub.next_billing_date;
                return (
                  <TableRow key={sub.id} className="transition-colors hover:bg-muted/30">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Avatar className="size-7 rounded-md after:rounded-md">
                          <AvatarImage src={sub.logo_url ?? undefined} alt={sub.name} className="rounded-md object-contain" />
                          <AvatarFallback>{sub.name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span>{sub.name}</span>
                        {dueSoon && (
                          <Badge variant={acknowledged ? "success" : "pending"} className="ml-2">
                            {acknowledged
                              ? t("subscriptions.acknowledged")
                              : formatDueLabel(sub.next_billing_date, t)}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatCurrency(sub.price, sub.currency, i18n.language)}
                      {sub.converted_price != null && sub.currency !== baseCurrency && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          (~{new Intl.NumberFormat(i18n.language, { style: "currency", currency: baseCurrency }).format(sub.converted_price)})
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{formatCycle(sub.cycle_count, sub.cycle_unit)}</TableCell>
                    <TableCell>
                      {sub.category?.name ?? "-"}
                    </TableCell>
                    <TableCell>
                      {sub.payment_method?.name ?? "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          sub.status === "active"
                            ? "default"
                            : sub.status === "trial"
                              ? "warning"
                              : "outline"
                        }
                      >
                        {t(`subscriptions.statuses.${sub.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span
                        title={sub.auto_renew ? t("subscriptions.auto_renew_enabled") : t("subscriptions.auto_renew_disabled")}
                        aria-label={sub.auto_renew ? t("subscriptions.auto_renew_enabled") : t("subscriptions.auto_renew_disabled")}
                        role="img"
                        className="inline-flex items-center"
                      >
                        <RefreshCw
                          className={`size-4 ${sub.auto_renew ? "text-pending" : "text-muted-foreground/80"}`}
                        />
                      </span>
                    </TableCell>
                    <TableCell>{formatNextBillingDate(sub.next_billing_date, i18n.language, t)}</TableCell>
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
                        {dueSoon && !acknowledged && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAcknowledge(sub.id)}
                          >
                            <CheckCircle2 className="size-4 text-pending" />
                            {t("subscriptions.acknowledge")}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteTarget(sub)}
                          aria-label={t("subscriptions.delete")}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
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

      <ConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title={t("subscriptions.confirmDeleteTitle")}
        message={t("subscriptions.confirmDeleteMessage", { name: deleteTarget?.name ?? "" })}
        confirmLabel={t("subscriptions.confirmDeleteConfirm")}
        cancelLabel={t("subscriptions.confirmDeleteCancel")}
        destructive
        onConfirm={async () => {
          if (deleteTarget) {
            await handleDelete(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
}
