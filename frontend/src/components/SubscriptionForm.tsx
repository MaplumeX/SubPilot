import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { Subscription, SubscriptionCreate, CycleUnit, SubscriptionStatus } from "@/api/types";
import { uploadLogo, listCategories, listPaymentMethods } from "@/api/subscriptions";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CheckIcon, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SubscriptionFormProps {
  key?: React.Key;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription?: Subscription | null;
  onSubmit: (data: SubscriptionCreate) => Promise<void>;
}

const CURRENCIES = ["CNY", "USD", "EUR", "GBP", "JPY"] as const;

const CYCLE_UNITS: CycleUnit[] = ["day", "week", "month", "year"];

type PresetKey = "weekly" | "monthly" | "quarterly" | "yearly" | "custom";

const ERROR_KEY_MAP: Record<string, string> = {
  "Invalid credentials": "errors.invalidCredentials",
  "Email already registered": "errors.emailRegistered",
  "Subscription not found": "errors.subscriptionNotFound",
  "Invalid file type. Allowed: JPG, PNG, SVG, GIF": "subscriptionForm.invalidFileType",
  "File size exceeds 2MB limit": "subscriptionForm.fileTooLarge",
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
  const { t } = useTranslation();
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
  const [category, setCategory] = useState(subscription?.category ?? "");
  const [paymentMethod, setPaymentMethod] = useState(subscription?.payment_method ?? "");
  const [subStatus, setSubStatus] = useState<SubscriptionStatus>(
    subscription?.status ?? "active"
  );
  const [startDate, setStartDate] = useState(subscription?.start_date ?? "");
  const [notes, setNotes] = useState(subscription?.notes ?? "");
  const [logoUrl, setLogoUrl] = useState(subscription?.logo_url ?? "");
  const [logoTab, setLogoTab] = useState("search");
  const [searchDomain, setSearchDomain] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [autoRenew, setAutoRenew] = useState(subscription?.auto_renew ?? true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [existingCategories, setExistingCategories] = useState<string[]>([]);
  const [paymentMethodOpen, setPaymentMethodOpen] = useState(false);
  const [existingPaymentMethods, setExistingPaymentMethods] = useState<string[]>([]);

  useEffect(() => {
    listCategories().then(setExistingCategories).catch(() => {});
    listPaymentMethods().then(setExistingPaymentMethods).catch(() => {});
  }, []);

  const previewUrl = logoUrl || null;

  const handleSearchLogo = () => {
    if (!searchDomain.trim()) return;
    const url = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(searchDomain.trim())}&sz=64`;
    setLogoUrl(url);
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/svg+xml", "image/gif"];
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
    if (!paymentMethod.trim()) {
      setError(t("subscriptionForm.paymentMethodRequired"));
      return;
    }

    setSubmitting(true);
    try {
      const payload: SubscriptionCreate = {
        name: name.trim(),
        price: priceNum,
        currency,
        cycle_count: countNum,
        cycle_unit: cycleUnit,
        category: category || null,
        payment_method: paymentMethod.trim(),
        status: subStatus,
        start_date: startDate,
        auto_renew: autoRenew,
        notes: notes || null,
        logo_url: logoUrl || null,
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
                <Avatar className="size-7">
                  <AvatarImage src={previewUrl} alt={name} />
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
                      placeholder={t("subscriptionForm.domainPlaceholder")}
                      value={searchDomain}
                      onChange={(e) => setSearchDomain(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearchLogo(); } }}
                    />
                    <Button type="button" variant="outline" onClick={handleSearchLogo}>
                      {t("subscriptionForm.search")}
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="upload" className="mt-2">
                  <Input
                    type="file"
                    accept=".jpg,.jpeg,.png,.svg,.gif"
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
              <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                <PopoverTrigger render={<Button variant="outline" role="combobox" aria-expanded={categoryOpen} className="w-full justify-between font-normal" />}>
                  {category || t("subscriptionForm.selectCategory")}
                  <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                </PopoverTrigger>
                <PopoverContent className="p-0" align="start" sideOffset={4}>
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder={t("subscriptionForm.selectCategory")}
                      value={category}
                      onValueChange={setCategory}
                    />
                    <CommandList>
                      <CommandEmpty>{t("subscriptionForm.selectCategory")}</CommandEmpty>
                      <CommandGroup>
                        {category && (
                          <CommandItem
                            value="__none__"
                            onSelect={() => { setCategory(""); setCategoryOpen(false); }}
                          >
                            {t("subscriptionForm.none")}
                          </CommandItem>
                        )}
                        {existingCategories.map((cat) => (
                          <CommandItem
                            key={cat}
                            value={cat}
                            onSelect={() => { setCategory(cat); setCategoryOpen(false); }}
                          >
                            <CheckIcon className={cn("mr-2 size-4", category === cat ? "opacity-100" : "opacity-0")} />
                            {cat}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t("subscriptionForm.paymentMethod")}</Label>
            <Popover open={paymentMethodOpen} onOpenChange={setPaymentMethodOpen}>
              <PopoverTrigger render={<Button variant="outline" role="combobox" aria-expanded={paymentMethodOpen} className="w-full justify-between font-normal" />}>
                {paymentMethod || t("subscriptionForm.selectPaymentMethod")}
                <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
              </PopoverTrigger>
              <PopoverContent className="p-0" align="start" sideOffset={4}>
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder={t("subscriptionForm.selectPaymentMethod")}
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                  />
                  <CommandList>
                    <CommandEmpty>{t("subscriptionForm.selectPaymentMethod")}</CommandEmpty>
                    <CommandGroup>
                      {existingPaymentMethods.map((pm) => (
                        <CommandItem
                          key={pm}
                          value={pm}
                          onSelect={() => { setPaymentMethod(pm); setPaymentMethodOpen(false); }}
                        >
                          <CheckIcon className={cn("mr-2 size-4", paymentMethod === pm ? "opacity-100" : "opacity-0")} />
                          {pm}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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

          <Button type="submit" disabled={submitting}>
            {submitting ? t("subscriptionForm.saving") : isEdit ? t("subscriptionForm.update") : t("subscriptionForm.create")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
