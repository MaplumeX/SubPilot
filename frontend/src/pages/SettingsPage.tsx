import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/auth-hook";
import { updateLocale } from "@/api/auth";
import { updateBaseCurrency } from "@/api/auth";
import {
  listCategories,
  createCategory,
  renameCategory,
  deleteCategory,
} from "@/api/categories";
import {
  listPaymentMethods,
  createPaymentMethod,
  renamePaymentMethod,
  deletePaymentMethod,
} from "@/api/payment_methods";
import type { Category, PaymentMethod } from "@/api/types";
import EntityManagerCard from "@/components/EntityManagerCard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast-store";
import { SUPPORTED_CURRENCIES, currencyLabel } from "@/lib/currencies";
import { isNonAuthError } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  getNotificationSettings,
  updateNotificationSettings,
  testNotificationChannel,
} from "@/api/notifications";
import type { NotificationSettings } from "@/api/types";

type ChannelKey = "email" | "telegram";

const TIMEZONES = [
  { value: "Asia/Shanghai", label: "Asia/Shanghai (UTC+8)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (UTC+9)" },
  { value: "Asia/Hong_Kong", label: "Asia/Hong_Kong (UTC+8)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (UTC+8)" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (UTC+5:30)" },
  { value: "Europe/London", label: "Europe/London" },
  { value: "Europe/Paris", label: "Europe/Paris" },
  { value: "Europe/Berlin", label: "Europe/Berlin" },
  { value: "America/New_York", label: "America/New_York" },
  { value: "America/Chicago", label: "America/Chicago" },
  { value: "America/Denver", label: "America/Denver" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles" },
  { value: "America/Sao_Paulo", label: "America/Sao_Paulo" },
  { value: "Australia/Sydney", label: "Australia/Sydney" },
  { value: "Pacific/Auckland", label: "Pacific/Auckland" },
  { value: "UTC", label: "UTC" },
] as const;

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { user, refreshUser } = useAuth();

  const handleLanguageChange = async (locale: string | null) => {
    if (!locale) return;
    i18n.changeLanguage(locale);
    if (user) {
      try {
        await updateLocale(locale);
      } catch (err) {
        // 401 handled by interceptor; language is already applied locally.
        if (isNonAuthError(err)) {
          toast({ title: t("errors.updateFailed"), variant: "destructive" });
        }
      }
    }
  };

  const handleBaseCurrencyChange = async (currency: string | null) => {
    if (!currency || !user) return;
    try {
      await updateBaseCurrency(currency);
      await refreshUser();
    } catch (err) {
      // 401 handled by interceptor.
      if (isNonAuthError(err)) {
        toast({ title: t("errors.updateFailed"), variant: "destructive" });
      }
    }
  };

  const baseCurrency = user?.base_currency ?? "CNY";

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-2xl font-bold leading-tight tracking-[-0.01em]">{t("settings.title")}</h2>
      <p className="text-sm text-muted-foreground">{t("settings.subtitle")}</p>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>{t("settings.language")}</CardTitle>
          <CardDescription>{t("settings.languageDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <Label>{t("settings.language")}</Label>
            <Select
              value={i18n.language}
              onValueChange={handleLanguageChange}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue label={i18n.language === "zh-CN" ? t("settings.chinese") : t("settings.english")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t("settings.english")}</SelectItem>
                <SelectItem value="zh-CN">{t("settings.chinese")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>{t("settings.baseCurrency")}</CardTitle>
          <CardDescription>{t("settings.baseCurrencyDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <Label>{t("settings.baseCurrency")}</Label>
            <Select
              value={baseCurrency}
              onValueChange={handleBaseCurrencyChange}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue label={currencyLabel(baseCurrency, i18n.language)} />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_CURRENCIES.map((code) => (
                  <SelectItem key={code} value={code}>
                    {currencyLabel(code, i18n.language)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <NotificationsCard />

      <CategoryManagerCard />
      <PaymentMethodManagerCard />
    </div>
  );
}

function CategoryManagerCard() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    listCategories()
      .then(setCategories)
      .catch((err) => {
        if (isNonAuthError(err)) {
          toast({ title: t("errors.loadFailed"), variant: "destructive" });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <EntityManagerCard
      title={t("settings.categories")}
      description={t("settings.categoryDescription")}
      entities={categories}
      loading={loading}
      i18n={{
        add: t("settings.addCategory"),
        rename: t("settings.rename"),
        delete: t("settings.delete"),
        emptyHint: t("settings.emptyHint"),
        namePlaceholder: t("settings.categoryNamePlaceholder"),
      }}
      onCreate={async (name) => {
        await createCategory(name);
        reload();
      }}
      onRename={async (id, name) => {
        await renameCategory(id, name);
        reload();
      }}
      onDelete={async (id) => {
        await deleteCategory(id);
        reload();
      }}
    />
  );
}

function PaymentMethodManagerCard() {
  const { t } = useTranslation();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    listPaymentMethods()
      .then(setPaymentMethods)
      .catch((err) => {
        if (isNonAuthError(err)) {
          toast({ title: t("errors.loadFailed"), variant: "destructive" });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <EntityManagerCard
      title={t("settings.paymentMethods")}
      description={t("settings.paymentMethodDescription")}
      entities={paymentMethods}
      loading={loading}
      i18n={{
        add: t("settings.addPaymentMethod"),
        rename: t("settings.rename"),
        delete: t("settings.delete"),
        emptyHint: t("settings.emptyHint"),
        namePlaceholder: t("settings.paymentMethodNamePlaceholder"),
      }}
      onCreate={async (name) => {
        await createPaymentMethod(name);
        reload();
      }}
      onRename={async (id, name) => {
        await renamePaymentMethod(id, name);
        reload();
      }}
      onDelete={async (id) => {
        await deletePaymentMethod(id);
        reload();
      }}
    />
  );
}

function NotificationsCard() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<ChannelKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getNotificationSettings()
      .then((data) => {
        if (active) setSettings(data);
      })
      .catch((err) => {
        // 401 handled by interceptor.
        if (isNonAuthError(err)) {
          toast({ title: t("errors.loadFailed"), variant: "destructive" });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const update = <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await updateNotificationSettings(settings);
      setSettings(saved);
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? t("notifications.saveFailed");
      setError(detail);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (channel: ChannelKey) => {
    if (!settings) return;
    setTesting(channel);
    setError(null);
    try {
      // Persist current values first so the test uses the latest credentials.
      const saved = await updateNotificationSettings(settings);
      setSettings(saved);
      await testNotificationChannel(channel);
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? t("notifications.testFailed");
      setError(detail);
    } finally {
      setTesting(null);
    }
  };

  if (loading) {
    return (
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>{t("notifications.title")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {t("notifications.loading")}
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return null;
  }

  const emailEnabled = settings.reminder_email_enabled;
  const telegramEnabled = settings.reminder_telegram_enabled;

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>{t("notifications.title")}</CardTitle>
        <CardDescription>{t("notifications.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>{t("notifications.masterSwitch")}</Label>
            <p className="text-xs text-muted-foreground">
              {t("notifications.masterSwitchDescription")}
            </p>
          </div>
          <Switch
            checked={settings.reminders_enabled}
            onCheckedChange={(v) => update("reminders_enabled", v)}
          />
        </div>

        <div className="space-y-2">
          <Label>{t("notifications.reminderDays")}</Label>
          <Input
            type="number"
            min={1}
            max={90}
            value={settings.reminder_days}
            onChange={(e) => update("reminder_days", Number(e.target.value))}
            className="w-[120px]"
          />
        </div>

        <div className="space-y-2">
          <Label>{t("notifications.reminderTime")}</Label>
          <Input
            type="time"
            step={60}
            value={settings.reminder_time.slice(0, 5)}
            onChange={(e) =>
              update("reminder_time", e.target.value.slice(0, 5))
            }
            className="w-[160px]"
          />
        </div>

        <div className="space-y-2">
          <Label>{t("notifications.timezone")}</Label>
          <Select
            value={settings.timezone}
            onValueChange={(v) => {
              if (v) update("timezone", v);
            }}
          >
            <SelectTrigger className="w-[280px]">
              <SelectValue
                label={
                  TIMEZONES.find((z) => z.value === settings.timezone)?.label ??
                  settings.timezone
                }
              />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((z) => (
                <SelectItem key={z.value} value={z.value}>
                  {z.label}
                </SelectItem>
              ))}
              {/* Keep current value selectable if not in the curated list */}
              {!TIMEZONES.some((z) => z.value === settings.timezone) && (
                <SelectItem value={settings.timezone}>{settings.timezone}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <Label>{t("notifications.emailChannel")}</Label>
            <Switch
              checked={emailEnabled}
              onCheckedChange={(v) => update("reminder_email_enabled", v)}
            />
          </div>
          {emailEnabled && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>{t("notifications.smtpHost")}</Label>
                <Input
                  value={settings.smtp_host ?? ""}
                  onChange={(e) => update("smtp_host", e.target.value)}
                  placeholder="smtp.example.com"
                />
              </div>
              <div className="space-y-1">
                <Label>{t("notifications.smtpPort")}</Label>
                <Input
                  type="number"
                  value={settings.smtp_port ?? ""}
                  onChange={(e) =>
                    update("smtp_port", e.target.value ? Number(e.target.value) : null)
                  }
                  placeholder="587"
                />
              </div>
              <div className="space-y-1">
                <Label>{t("notifications.smtpUser")}</Label>
                <Input
                  value={settings.smtp_user ?? ""}
                  onChange={(e) => update("smtp_user", e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>{t("notifications.smtpPassword")}</Label>
                <Input
                  type="password"
                  value={settings.smtp_password ?? ""}
                  onChange={(e) => update("smtp_password", e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div className="col-span-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTest("email")}
                  disabled={testing === "email"}
                >
                  {testing === "email"
                    ? t("notifications.testing")
                    : t("notifications.sendTest")}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <Label>{t("notifications.telegramChannel")}</Label>
            <Switch
              checked={telegramEnabled}
              onCheckedChange={(v) => update("reminder_telegram_enabled", v)}
            />
          </div>
          {telegramEnabled && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>{t("notifications.telegramBotToken")}</Label>
                <Input
                  value={settings.telegram_bot_token ?? ""}
                  onChange={(e) => update("telegram_bot_token", e.target.value)}
                  placeholder="123456:ABC-DEF..."
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>{t("notifications.telegramChatId")}</Label>
                <Input
                  value={settings.telegram_chat_id ?? ""}
                  onChange={(e) => update("telegram_chat_id", e.target.value)}
                  placeholder="123456789"
                />
              </div>
              <div className="col-span-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTest("telegram")}
                  disabled={testing === "telegram"}
                >
                  {testing === "telegram"
                    ? t("notifications.testing")
                    : t("notifications.sendTest")}
                </Button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <Button onClick={handleSave} disabled={saving}>
          {saving ? t("notifications.saving") : t("notifications.save")}
        </Button>
      </CardContent>
    </Card>
  );
}
