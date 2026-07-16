import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { Subscription, SubscriptionCreate, CycleUnit, SubscriptionStatus, LogoCandidate } from "@/api/types";

type ReminderMode = "default" | "custom";
import { uploadLogo, searchLogo, cacheLogo } from "@/api/subscriptions";
import { listCategories } from "@/api/categories";
import { listPaymentMethods } from "@/api/payment_methods";
import type { Category, PaymentMethod } from "@/api/types";
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
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast-store";
import { SUPPORTED_CURRENCIES, currencyLabel } from "@/lib/currencies";
import { isNonAuthError } from "@/lib/utils";

interface SubscriptionFormProps {
  key?: React.Key;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription?: Subscription | null;
  onSubmit: (data: SubscriptionCreate) => Promise<void>;
}

const CYCLE_UNITS: CycleUnit[] = ["day", "week", "month", "year"];

type PresetKey = "weekly" | "monthly" | "quarterly" | "yearly" | "custom";

const ERROR_KEY_MAP: Record<string, string> = {
  "Invalid credentials": "errors.invalidCredentials",
  "Email already registered": "errors.emailRegistered",
  "Subscription not found": "errors.subscriptionNotFound",
  "Invalid file type. Allowed: JPG, PNG, GIF": "subscriptionForm.invalidFileType",
  "File size exceeds 2MB limit": "subscriptionForm.fileTooLarge",
  "Query must not be empty": "subscriptionForm.logoSearchFailed",
  "Image URL host is not allowed": "subscriptionForm.cacheLogoFailed",
};

const PRESET_MAP: Record<string, { cycle_count: number; cycle_unit: CycleUnit }> = {
  weekly: { cycle_count: 1, cycle_unit: "week" },
  monthly: { cycle_count: 1, cycle_unit: "month" },
  quarterly: { cycle_count: 3, cycle_unit: "month" },
  yearly: { cycle_count: 1, cycle_unit: "year" },
};

function inferPreset(cycle_count: number, cycle_unit: CycleUnit): PresetKey {
  for (const [key, val] of Object.entries(PRESET_MAP)) {
    if (val.cycle_count === cycle_count && val.cycle_unit === cycle_unit) return key as PresetKey;
  }
  return "custom";
}

export default function SubscriptionForm({
  open,
  onOpenChange,
  subscription,
  onSubmit,
}: SubscriptionFormProps) {
  const { t, i18n } = useTranslation();
  const isEdit = !!subscription;

  const [name, setName] = useState(subscription?.name ?? "");
  const [price, setPrice] = useState(subscription?.price?.toString() ?? "");
  const [currency, setCurrency] = useState(subscription?.currency ?? "CNY");
  const [preset, setPreset] = useState<PresetKey>(
    subscription ? inferPreset(subscription.cycle_count, subscription.cycle_unit) : "monthly"
  );
  const [cycleCount, setCycleCount] = useState(
    subscription?.cycle_count?.toString() ?? "1"
  );
  const [cycleUnit, setCycleUnit] = useState<CycleUnit>(
    subscription?.cycle_unit ?? "month"
  );
  const [category, setCategory] = useState<number | null>(subscription?.category?.id ?? null);
  const [paymentMethod, setPaymentMethod] = useState<number | null>(subscription?.payment_method?.id ?? null);
  const [subStatus, setSubStatus] = useState<SubscriptionStatus>(
    subscription?.status ?? "active"
  );
  const [startDate, setStartDate] = useState(subscription?.start_date ?? "");
  const [notes, setNotes] = useState(subscription?.notes ?? "");
  const [logoUrl, setLogoUrl] = useState(subscription?.logo_url ?? "");
  const [logoTab, setLogoTab] = useState("search");
  const [searchDomain, setSearchDomain] = useState("");
  const [searchResults, setSearchResults] = useState<LogoCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [cachingIndex, setCachingIndex] = useState<number | null>(null);
  const [searchError, setSearchError] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [autoRenew, setAutoRenew] = useState(subscription?.auto_renew ?? true);
  const [reminderEnabled, setReminderEnabled] = useState(subscription?.reminder_enabled ?? true);
  const [reminderMode, setReminderMode] = useState<ReminderMode>(subscription?.reminder_mode ?? "default");
  const [reminderDays, setReminderDays] = useState<string>(
    subscription?.reminder_days != null ? String(subscription.reminder_days) : ""
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [existingCategories, setExistingCategories] = useState<Category[]>([]);
  const [existingPaymentMethods, setExistingPaymentMethods] = useState<PaymentMethod[]>([]);

  // Re-sync all form state when the dialog opens so residual data from a
  // previous open (create or edit) is cleared.  Without this, the component
  // instance is reused across opens (fixed key in AppLayout, same "create" key
  // in SubscriptionsPage) and useState initialisers only run on mount.
  useEffect(() => {
    if (!open) return;
    setName(subscription?.name ?? "");
    setPrice(subscription?.price?.toString() ?? "");
    setCurrency(subscription?.currency ?? "CNY");
    setPreset(subscription ? inferPreset(subscription.cycle_count, subscription.cycle_unit) : "monthly");
    setCycleCount(subscription?.cycle_count?.toString() ?? "1");
    setCycleUnit(subscription?.cycle_unit ?? "month");
    setCategory(subscription?.category?.id ?? null);
    setPaymentMethod(subscription?.payment_method?.id ?? null);
    setSubStatus(subscription?.status ?? "active");
    setStartDate(subscription?.start_date ?? "");
    setNotes(subscription?.notes ?? "");
    setLogoUrl(subscription?.logo_url ?? "");
    setLogoTab("search");
    setSearchDomain("");
    setSearchResults([]);
    setSearching(false);
    setHasSearched(false);
    setCachingIndex(null);
    setSearchError("");
    setLinkUrl("");
    setUploading(false);
    setAutoRenew(subscription?.auto_renew ?? true);
    setReminderEnabled(subscription?.reminder_enabled ?? true);
    setReminderMode(subscription?.reminder_mode ?? "default");
    setReminderDays(subscription?.reminder_days != null ? String(subscription.reminder_days) : "");
    setError("");
    setSubmitting(false);
  }, [open, subscription]);

  useEffect(() => {
    listCategories().then(setExistingCategories).catch((err) => {
      if (isNonAuthError(err)) {
        toast({ title: t("errors.loadFailed"), variant: "destructive" });
      }
    });
    listPaymentMethods().then(setExistingPaymentMethods).catch((err) => {
      if (isNonAuthError(err)) {
        toast({ title: t("errors.loadFailed"), variant: "destructive" });
      }
    });
  }, []);

  const previewUrl = logoUrl || null;

  const handleSearchLogo = async () => {
    if (!searchDomain.trim()) return;
    setSearching(true);
    setSearchError("");
    setHasSearched(true);
    try {
      const { results } = await searchLogo(searchDomain.trim());
      setSearchResults(results);
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "";
      const key = ERROR_KEY_MAP[detail];
      setSearchError(key ? t(key) : t("subscriptionForm.logoSearchFailed"));
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handlePickLogo = async (candidate: LogoCandidate, index: number) => {
    setCachingIndex(index);
    setSearchError("");
    try {
      const { logo_url } = await cacheLogo(candidate.image);
      setLogoUrl(logo_url);
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "";
      const key = ERROR_KEY_MAP[detail];
      setSearchError(key ? t(key) : t("subscriptionForm.cacheLogoFailed"));
    } finally {
      setCachingIndex(null);
    }
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      setError(t("subscriptionForm.invalidFileType"));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError(t("subscriptionForm.fileTooLarge"));
      return;
    }

    setUploading(true);
    setError("");
    try {
      const result = await uploadLogo(file);
      setLogoUrl(result.logo_url);
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Upload failed";
      const key = ERROR_KEY_MAP[detail];
      setError(key ? t(key) : t("subscriptionForm.uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const handleLinkLogo = () => {
    if (!linkUrl.trim()) return;
    setLogoUrl(linkUrl.trim());
  };

  const handleRemoveLogo = () => {
    setLogoUrl("");
    setSearchDomain("");
    setSearchResults([]);
    setHasSearched(false);
    setSearchError("");
    setLinkUrl("");
  };

  const handlePresetChange = (p: PresetKey) => {
    setPreset(p);
    if (p !== "custom" && PRESET_MAP[p]) {
      setCycleCount(PRESET_MAP[p].cycle_count.toString());
      setCycleUnit(PRESET_MAP[p].cycle_unit);
    }
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
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
    const countNum = parseInt(cycleCount, 10);
    if (isNaN(countNum) || countNum < 1) {
      setError(t("subscriptionForm.cycleCountMin"));
      return;
    }
    if (!startDate) {
      setError(t("subscriptionForm.startDateRequired"));
      return;
    }
    if (!paymentMethod) {
      if (existingPaymentMethods.length === 0) {
        setError(t("subscriptionForm.emptyPaymentMethodHint"));
        return;
      }
      setError(t("subscriptionForm.paymentMethodRequired"));
      return;
    }
    if (reminderEnabled && reminderMode === "custom") {
      const daysNum = parseInt(reminderDays, 10);
      if (isNaN(daysNum) || daysNum < 1 || daysNum > 90) {
        setError(t("subscriptionForm.reminderDaysRange"));
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload: SubscriptionCreate = {
        name: name.trim(),
        price: priceNum,
        currency,
        cycle_count: countNum,
        cycle_unit: cycleUnit,
        category_id: category,
        payment_method_id: paymentMethod,
        status: subStatus,
        start_date: startDate,
        auto_renew: autoRenew,
        notes: notes || null,
        logo_url: logoUrl || null,
        reminder_enabled: reminderEnabled,
        reminder_mode: reminderMode,
        reminder_days: reminderMode === "custom" ? Number(reminderDays) : null,
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

  const presetButtons: { key: PresetKey; label: string }[] = [
    { key: "weekly", label: t("subscriptions.cycles.weekly") },
    { key: "monthly", label: t("subscriptions.cycles.monthly") },
    { key: "quarterly", label: t("subscriptions.cycles.quarterly") },
    { key: "yearly", label: t("subscriptions.cycles.yearly") },
    { key: "custom", label: t("subscriptionForm.customCycle") },
  ];

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
            <Label>{t("subscriptionForm.logo")}</Label>
            {previewUrl ? (
              <div className="flex items-center gap-3">
                <Avatar className="size-7 rounded-md after:rounded-md">
                  <AvatarImage src={previewUrl} alt={name} className="rounded-md object-contain" />
                  <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground truncate max-w-[200px]">{previewUrl}</span>
                <Button type="button" variant="ghost" size="sm" onClick={handleRemoveLogo}>
                  {t("subscriptionForm.removeLogo")}
                </Button>
              </div>
            ) : (
              <Tabs value={logoTab} onValueChange={setLogoTab}>
                <TabsList>
                  <TabsTrigger value="search">{t("subscriptionForm.logoSearch")}</TabsTrigger>
                  <TabsTrigger value="upload">{t("subscriptionForm.logoUpload")}</TabsTrigger>
                  <TabsTrigger value="link">{t("subscriptionForm.logoLink")}</TabsTrigger>
                </TabsList>
                <TabsContent value="search" className="mt-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder={t("subscriptionForm.logoSearchPlaceholder")}
                      value={searchDomain}
                      onChange={(e) => setSearchDomain(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearchLogo(); } }}
                      disabled={searching}
                    />
                    <Button type="button" variant="outline" onClick={handleSearchLogo} disabled={searching}>
                      {searching ? t("subscriptionForm.searching") : t("subscriptionForm.search")}
                    </Button>
                  </div>
                  {searchError && (
                    <p className="text-sm text-destructive mt-2">{searchError}</p>
                  )}
                  {searching && (
                    <p className="text-sm text-muted-foreground mt-2">{t("subscriptionForm.searching")}</p>
                  )}
                  {!searching && hasSearched && searchResults.length === 0 && !searchError && (
                    <p className="text-sm text-muted-foreground mt-2">{t("subscriptionForm.noLogos")}</p>
                  )}
                  {searchResults.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mt-2">
                      {searchResults.map((candidate, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handlePickLogo(candidate, i)}
                          disabled={cachingIndex !== null}
                          className="rounded-md border p-1 hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <img
                            src={candidate.thumbnail}
                            alt=""
                            loading="lazy"
                            className="aspect-square w-full object-contain"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="upload" className="mt-2">
                  <Input
                    type="file"
                    accept=".jpg,.jpeg,.png,.gif"
                    onChange={handleUploadLogo}
                    disabled={uploading}
                  />
                </TabsContent>
                <TabsContent value="link" className="mt-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://..."
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleLinkLogo(); } }}
                    />
                    <Button type="button" variant="outline" onClick={handleLinkLogo}>
                      {t("subscriptionForm.confirm")}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>

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
                  <SelectValue label={currencyLabel(currency, i18n.language)} />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {currencyLabel(c, i18n.language)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t("subscriptionForm.billingCycle")}</Label>
            <div className="flex flex-wrap gap-2">
              {presetButtons.map(({ key, label }) => (
                <Button
                  key={key}
                  type="button"
                  variant={preset === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePresetChange(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
            {preset === "custom" && (
              <div className="grid grid-cols-2 gap-4 mt-2">
                <Input
                  type="number"
                  min="1"
                  value={cycleCount}
                  onChange={(e) => setCycleCount(e.target.value)}
                  placeholder={t("subscriptionForm.cycleCount")}
                />
                <Select value={cycleUnit} onValueChange={(v) => setCycleUnit(v as CycleUnit)}>
                  <SelectTrigger>
                    <SelectValue label={t(`subscriptions.cycle_units.${cycleUnit}`)} />
                  </SelectTrigger>
                  <SelectContent>
                    {CYCLE_UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {t(`subscriptions.cycle_units.${u}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <div className="flex flex-col gap-2">
              <Label>{t("subscriptionForm.category")}</Label>
              {existingCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("subscriptionForm.emptyCategoryHint")}</p>
              ) : (
                <Select value={category != null ? String(category) : "__none__"} onValueChange={(v) => setCategory(v === "__none__" ? null : Number(v))}>
                  <SelectTrigger>
                    <SelectValue label={category != null ? existingCategories.find((c) => c.id === category)?.name : t("subscriptionForm.none")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("subscriptionForm.none")}</SelectItem>
                    {existingCategories.map((cat) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t("subscriptionForm.paymentMethod")}</Label>
            {existingPaymentMethods.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("subscriptionForm.emptyPaymentMethodHint")}</p>
            ) : (
              <Select value={paymentMethod != null ? String(paymentMethod) : null} onValueChange={(v) => setPaymentMethod(v != null ? Number(v) : null)}>
                <SelectTrigger>
                  <SelectValue label={paymentMethod != null ? existingPaymentMethods.find((p) => p.id === paymentMethod)?.name : undefined} placeholder={t("subscriptionForm.selectPaymentMethod")} />
                </SelectTrigger>
                <SelectContent>
                  {existingPaymentMethods.map((pm) => (
                    <SelectItem key={pm.id} value={String(pm.id)}>
                      {pm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

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

          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("subscriptionForm.reminder")}</Label>
                <p className="text-xs text-muted-foreground">{t("subscriptionForm.reminderDescription")}</p>
              </div>
              <Switch
                checked={reminderEnabled}
                onCheckedChange={setReminderEnabled}
              />
            </div>
            {reminderEnabled && (
              <>
                <div className="space-y-1">
                  <Label>{t("subscriptionForm.reminderMode")}</Label>
                  <Select
                    value={reminderMode}
                    onValueChange={(v) => setReminderMode(v as ReminderMode)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        label={reminderMode === "custom"
                          ? t("subscriptionForm.reminderModeCustom")
                          : t("subscriptionForm.reminderModeDefault")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">{t("subscriptionForm.reminderModeDefault")}</SelectItem>
                      <SelectItem value="custom">{t("subscriptionForm.reminderModeCustom")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {reminderMode === "custom" && (
                  <div className="space-y-1">
                    <Label>{t("subscriptionForm.reminderDays")}</Label>
                    <Input
                      type="number"
                      min={1}
                      max={90}
                      value={reminderDays}
                      onChange={(e) => setReminderDays(e.target.value)}
                      placeholder="1-90"
                    />
                  </div>
                )}
              </>
            )}
          </div>

          <Button type="submit" disabled={submitting}>
            {submitting ? t("subscriptionForm.saving") : isEdit ? t("subscriptionForm.update") : t("subscriptionForm.create")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
