import { useState, type FormEvent as ReactFormEvent } from "react";
import { useTranslation } from "react-i18next";
import type { Subscription, SubscriptionCreate, BillingCycle, SubscriptionStatus } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SubscriptionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription?: Subscription | null;
  onSubmit: (data: SubscriptionCreate) => Promise<void>;
}

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

const CURRENCIES = ["CNY", "USD", "EUR", "GBP", "JPY"] as const;

const ERROR_KEY_MAP: Record<string, string> = {
  "Invalid credentials": "errors.invalidCredentials",
  "Email already registered": "errors.emailRegistered",
  "Subscription not found": "errors.subscriptionNotFound",
};

export default function SubscriptionForm({
  open,
  onOpenChange,
  subscription,
  onSubmit,
}: SubscriptionFormProps) {
  const { t } = useTranslation();
  const isEdit = !!subscription;

  const [name, setName] = useState(subscription?.name ?? "");
  const [price, setPrice] = useState(subscription?.price?.toString() ?? "");
  const [currency, setCurrency] = useState(subscription?.currency ?? "CNY");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(
    subscription?.billing_cycle ?? "monthly"
  );
  const [category, setCategory] = useState(subscription?.category ?? "");
  const [subStatus, setSubStatus] = useState<SubscriptionStatus>(
    subscription?.status ?? "active"
  );
  const [startDate, setStartDate] = useState(subscription?.start_date ?? "");
  const [nextBillingDate, setNextBillingDate] = useState(
    subscription?.next_billing_date ?? ""
  );
  const [notes, setNotes] = useState(subscription?.notes ?? "");
  const [autoRenew, setAutoRenew] = useState(subscription?.auto_renew ?? true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: ReactFormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError(t("subscriptionForm.nameRequired"));
      return;
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError(t("subscriptionForm.pricePositive"));
      return;
    }
    if (!startDate) {
      setError(t("subscriptionForm.startDateRequired"));
      return;
    }

    setSubmitting(true);
    try {
      const payload: SubscriptionCreate = {
        name: name.trim(),
        price: priceNum,
        currency,
        billing_cycle: billingCycle,
        category: category || null,
        status: subStatus,
        start_date: startDate,
        next_billing_date: nextBillingDate || null,
        auto_renew: autoRenew,
        notes: notes || null,
      };
      await onSubmit(payload);
      onOpenChange(false);
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Failed to save subscription";
      const key = ERROR_KEY_MAP[detail];
      setError(key ? t(key) : t("subscriptionForm.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("subscriptionForm.editTitle") : t("subscriptionForm.addTitle")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-col gap-2">
            <Label htmlFor="name">{t("subscriptionForm.name")}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="price">{t("subscriptionForm.price")}</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t("subscriptionForm.currency")}</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v ?? "CNY")}>
                <SelectTrigger>
                  <SelectValue label={t(`subscriptionForm.currencies.${currency}`)} />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {t(`subscriptionForm.currencies.${c}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>{t("subscriptionForm.billingCycle")}</Label>
              <Select
                value={billingCycle}
                onValueChange={(v) => setBillingCycle(v as BillingCycle)}
              >
                <SelectTrigger>
                  <SelectValue label={t(`subscriptions.cycles.${billingCycle}`)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">{t("subscriptions.cycles.weekly")}</SelectItem>
                  <SelectItem value="monthly">{t("subscriptions.cycles.monthly")}</SelectItem>
                  <SelectItem value="quarterly">{t("subscriptions.cycles.quarterly")}</SelectItem>
                  <SelectItem value="yearly">{t("subscriptions.cycles.yearly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t("subscriptionForm.status")}</Label>
              <Select
                value={subStatus}
                onValueChange={(v) => setSubStatus(v as SubscriptionStatus)}
              >
                <SelectTrigger>
                  <SelectValue label={t(`subscriptions.statuses.${subStatus}`)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t("subscriptions.statuses.active")}</SelectItem>
                  <SelectItem value="cancelled">{t("subscriptions.statuses.cancelled")}</SelectItem>
                  <SelectItem value="trial">{t("subscriptions.statuses.trial")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t("subscriptionForm.category")}</Label>
            <Select value={category || undefined} onValueChange={(v) => setCategory(v === "__none__" ? "" : (v ?? ""))}>
              <SelectTrigger>
                <SelectValue label={category ? t(`subscriptions.categories.${category}`) : undefined} placeholder={t("subscriptionForm.none")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t("subscriptionForm.none")}</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {t(`subscriptions.categories.${cat}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="start_date">{t("subscriptionForm.startDate")}</Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="next_billing_date">{t("subscriptionForm.nextBillingDate")}</Label>
              <Input
                id="next_billing_date"
                type="date"
                value={nextBillingDate}
                onChange={(e) => setNextBillingDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">{t("subscriptionForm.notes")}</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={autoRenew}
              onCheckedChange={setAutoRenew}
            />
            <Label>{t("subscriptionForm.auto_renew")}</Label>
          </div>

          <Button type="submit" disabled={submitting}>
            {submitting ? t("subscriptionForm.saving") : isEdit ? t("subscriptionForm.update") : t("subscriptionForm.create")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
