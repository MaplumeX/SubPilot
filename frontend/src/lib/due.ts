// Minimal t() shape we depend on (avoids coupling to i18next internals).
type TFunc = (key: string, options?: Record<string, unknown>) => string;

/** Per-subscription effective reminder days (D2/D3).
 *  custom mode -> sub.reminder_days (fallback to global if null);
 *  default mode -> userReminderDays.
 *  Not affected by sub.reminder_enabled (that only gates notifications). */
export function effectiveDaysFor(
  sub: { reminder_mode?: "default" | "custom"; reminder_days?: number | null },
  userReminderDays: number
): number {
  if (sub.reminder_mode === "custom") {
    return sub.reminder_days != null ? sub.reminder_days : userReminderDays;
  }
  return userReminderDays;
}

/**
 * Format a billing date as a locale-specific short date string.
 * Returns an empty string when the date is missing.
 */
export function formatBillingDate(
  dateStr: string | null,
  locale: string
): string {
  if (!dateStr) return "";
  const next = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(next.getTime())) return dateStr;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(next);
}

/**
 * Format a billing date as "<date> (<relative label>)", e.g. "2026-07-21 (3天后)".
 * Returns "-" when the date is missing.
 */
export function formatNextBillingDate(
  dateStr: string | null,
  locale: string,
  t: TFunc,
  now: Date = new Date()
): string {
  if (!dateStr) return "-";
  const date = formatBillingDate(dateStr, locale);
  const relative = formatDueLabel(dateStr, t, now);
  return `${date} (${relative})`;
}

/**
 * Format a relative "days until" label for a billing date.
 * Returns one of: dueToday | dueInDays (singular/plural per locale).
 * Falls back to the raw date string when the date is missing or past.
 */
export function formatDueLabel(
  dateStr: string | null,
  t: TFunc,
  now: Date = new Date()
): string {
  if (!dateStr) return "-";
  const next = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(next.getTime())) return dateStr;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(next.getFullYear(), next.getMonth(), next.getDate());
  const days = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (days <= 0) return t("dashboard.dueToday");
  return t("dashboard.dueInDays", { count: days });
}

/**
 * Whether a subscription is "due soon" within the reminder window.
 */
export function isDueWithin(
  nextBillingDate: string | null,
  reminderDays: number,
  now: Date = new Date()
): boolean {
  if (!nextBillingDate) return false;
  const next = new Date(nextBillingDate + "T00:00:00");
  if (Number.isNaN(next.getTime())) return false;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const deadline = new Date(today);
  deadline.setDate(today.getDate() + Math.max(0, reminderDays));
  return next >= today && next <= deadline;
}