import { useState, useEffect } from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/auth-hook";
import { cn, isNonAuthError, toastError } from "@/lib/utils";
import { getNotificationSettings } from "@/api/notifications";
import DashboardPage from "@/pages/DashboardPage";
import SubscriptionsPage from "@/pages/SubscriptionsPage";
import SettingsPage from "@/pages/SettingsPage";
import StatisticsPage from "@/pages/StatisticsPage";
import CalendarPage from "@/pages/CalendarPage";
import SubscriptionForm from "@/components/SubscriptionForm";
import ThemeToggle from "@/components/theme-toggle";
import { Toaster } from "@/components/ui/toaster";
import { Menu } from "lucide-react";
import { Logo } from "@/components/Logo";
import { createSubscription } from "@/api/subscriptions";
import type { SubscriptionCreate } from "@/api/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useKeyboardShortcuts } from "@/lib/use-keyboard-shortcuts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const NAV_ITEMS = [
  { to: "/", labelKey: "layout.dashboard", match: (p: string) => p === "/" },
  {
    to: "/subscriptions",
    labelKey: "layout.subscriptions",
    match: (p: string) => p.startsWith("/subscriptions"),
  },
  {
    to: "/calendar",
    labelKey: "layout.calendar",
    match: (p: string) => p.startsWith("/calendar"),
  },
  {
    to: "/statistics",
    labelKey: "layout.statistics",
    match: (p: string) => p.startsWith("/statistics"),
  },
  {
    to: "/settings",
    labelKey: "layout.settings",
    match: (p: string) => p.startsWith("/settings"),
  },
] as const;

export default function AppLayout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const location = useLocation();
  const [formOpen, setFormOpen] = useState(false);
  const [reminderDays, setReminderDays] = useState<number>(3);
  const { helpOpen, setHelpOpen, shortcuts, t: tSc } = useKeyboardShortcuts(() => setFormOpen(true));

  useEffect(() => {
    getNotificationSettings()
      .then((s) => setReminderDays(s.reminder_days))
      .catch((err) => {
        // 401 handled by interceptor; default reminderDays stays at 3.
        if (isNonAuthError(err)) {
          toastError(err, t);
        }
      });
  }, []);

  const handleLogout = () => {
    logout();
    window.location.assign("/login");
  };

  const handleCreate = async (data: SubscriptionCreate) => {
    await createSubscription(data);
    setFormOpen(false);
  };

  const mainId = "main-content";

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href={`#${mainId}`}
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-popover focus:px-4 focus:py-2 focus:text-sm focus:ring-2 focus:ring-ring"
      >
        {t("layout.skipToContent")}
      </a>
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b bg-background/80 px-4 py-3 backdrop-blur-sm sm:px-6 sticky top-0 z-50">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            <Logo />
            {t("layout.appName")}
          </h1>
          {/* Desktop nav — hidden on mobile, hamburger replaces it */}
          <nav className="hidden items-center gap-x-1 sm:flex" aria-label="Primary">
            {NAV_ITEMS.map(({ to, labelKey, match }) => {
              const active = match(location.pathname);
              return (
                <Link
                  key={to}
                  to={to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-md px-3 py-1 text-sm transition-colors",
                    active
                      ? "font-medium bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {t(labelKey)}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {/* Mobile nav — hamburger dropdown replacing the wrapped nav links */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:hidden"
              aria-label={t("layout.menu")}
            >
              <Menu className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {NAV_ITEMS.map(({ to, labelKey, match }) => {
                const active = match(location.pathname);
                return (
                  <DropdownMenuItem
                    key={to}
                    render={<Link to={to} />}
                    aria-current={active ? "page" : undefined}
                    className={cn(active && "font-medium")}
                  >
                    {t(labelKey)}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          <ThemeToggle />
          <span className="hidden text-sm text-muted-foreground sm:inline">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("layout.signOut")}
          </button>
        </div>
      </header>

      <main id={mainId} className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6 lg:p-8" tabIndex={-1}>
        <Routes>
          <Route
            path="/"
            element={
              <DashboardPage
                onAddSubscription={() => setFormOpen(true)}
                reminderDays={reminderDays}
              />
            }
          />
          <Route path="/subscriptions" element={<SubscriptionsPage />} />
          <Route
            path="/calendar"
            element={<CalendarPage reminderDays={reminderDays} />}
          />
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <SubscriptionForm
        key="app-create"
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
      />
      <Toaster />
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{tSc("shortcuts.title")}</DialogTitle>
            <DialogDescription>
              <ul className="mt-2 space-y-1.5">
                {shortcuts.map((s) => (
                  <li key={s.keys} className="flex items-center justify-between gap-4">
                    <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums">{s.keys}</kbd>
                    <span className="text-sm text-muted-foreground">{tSc(s.description)}</span>
                  </li>
                ))}
              </ul>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
