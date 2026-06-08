import { useTranslation } from "react-i18next";
import { useAuth } from "@/auth-hook";
import { updateLocale } from "@/api/auth";
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
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();

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
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t("settings.english")}</SelectItem>
                <SelectItem value="zh-CN">{t("settings.chinese")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
