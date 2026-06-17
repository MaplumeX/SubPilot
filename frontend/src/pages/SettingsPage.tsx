import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/auth-hook";
import { updateLocale } from "@/api/auth";
import { updateBaseCurrency } from "@/api/auth";
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
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  getNotificationSettings,
  updateNotificationSettings,
  testNotificationChannel,
} from "@/api/notifications";
import type { NotificationSettings } from "@/api/types";

type ChannelKey = "email" | "telegram";

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { user, refreshUser } = useAuth();

  const handleLanguageChange = async (locale: string | null) => {
    if (!locale) return;
    i18n.changeLanguage(locale);
    if (user) {
      try {
        await updateLocale(locale);
      } catch {
        // silently fail — language is already applied locally
      }
    }
  };

  const handleBaseCurrencyChange = async (currency: string | null) => {
    if (!currency || !user) return;
    try {
      await updateBaseCurrency(currency);
      await refreshUser();
    } catch {
      // silently fail
    }
  };

  const CURRENCIES = [
    { value: "CNY", label: t("subscriptionForm.currencies.CNY") },
    { value: "USD", label: t("subscriptionForm.currencies.USD") },
    { value: "EUR", label: t("subscriptionForm.currencies.EUR") },
    { value: "GBP", label: t("subscriptionForm.currencies.GBP") },
    { value: "JPY", label: t("subscriptionForm.currencies.JPY") },
  ];

  const REMINDER_DAYS_OPTIONS = [1, 3, 7, 14];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t("settings.title")}</h2>

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
              value={user?.base_currency ?? "CNY"}
              onValueChange={handleBaseCurrencyChange}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue label={CURRENCIES.find(c => c.value === (user?.base_currency ?? "CNY"))?.label ?? "CNY"} />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <NotificationsCard reminderDaysOptions={REMINDER_DAYS_OPTIONS} />
    </div>
  );
}

function NotificationsCard({
  reminderDaysOptions,
}: {
  reminderDaysOptions: number[];
}) {
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
      .catch(() => {
        // 401 handled by interceptor
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
          <Select
            value={String(settings.reminder_days)}
            onValueChange={(v) => update("reminder_days", Number(v))}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {reminderDaysOptions.map((d) => (
                <SelectItem key={d} value={String(d)}>
                  {t("notifications.daysAhead", { count: d })}
                </SelectItem>
              ))}
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
