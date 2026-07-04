import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme-hook";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ThemeToggle() {
  const { t } = useTranslation();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const themes = [
    { value: "light", label: t("theme.light"), icon: Sun },
    { value: "dark", label: t("theme.dark"), icon: Moon },
    { value: "system", label: t("theme.system"), icon: Monitor },
  ] as const;

  const CurrentIcon =
    themes.find((th) => th.value === resolvedTheme)?.icon ??
    themes.find((th) => th.value === "system")!.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-label={t("theme.toggleLabel")}
      >
        <CurrentIcon className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {themes.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem
            key={value}
            className={cn(
              "flex items-center gap-2",
              theme === value && "font-medium"
            )}
            aria-checked={theme === value}
            role="menuitemradio"
            onClick={() => setTheme(value)}
          >
            <Icon className="size-4" />
            {label}
            {theme === value && (
              <span className="ml-auto text-xs text-muted-foreground" aria-hidden="true">&#10003;</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}