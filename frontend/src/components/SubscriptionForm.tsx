import { useState, type FormEvent as ReactSubmitEvent } from "react";
import { useTranslation } from "react-i18next";
import type { Subscription, SubscriptionCreate, BillingCycle, SubscriptionStatus } from "@/api/types";
import { uploadLogo } from "@/api/subscriptions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  "Invalid file type. Allowed: JPG, PNG, SVG, GIF": "subscriptionForm.invalidFileType",
  "File size exceeds 2MB limit": "subscriptionForm.fileTooLarge",
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
  const [logoUrl, setLogoUrl] = useState(subscription?.logo_url ?? "");
  const [logoTab, setLogoTab] = useState("search");
  const [searchDomain, setSearchDomain] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  const handleSubmit = async (e: ReactSubmitEvent<HTMLFormElement>) => {
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

          <Button type="submit" disabled={submitting}>
            {submitting ? t("subscriptionForm.saving") : isEdit ? t("subscriptionForm.update") : t("subscriptionForm.create")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
