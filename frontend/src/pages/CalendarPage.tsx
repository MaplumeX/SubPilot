import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { listSubscriptions } from "@/api/subscriptions";
import type { Subscription } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { formatDueLabel, isDueWithin } from "@/lib/due";
import { formatCurrency } from "@/lib/currencies";
import { cn, isNonAuthError } from "@/lib/utils";
import { toast } from "@/components/ui/toast-store";

const MAX_VISIBLE_EVENTS = 2;
const WEEK_DAYS = 7;

/** Resolve the first day of the week (0 = Sunday, 1 = Monday) for a locale. */
function getFirstDayOfWeek(locale: string): 0 | 1 {
  try {
    // weekInfo is a newer stage API not in TS lib types; narrow via a cast.
    const loc = new Intl.Locale(locale) as Intl.Locale & {
      weekInfo?: { firstDay: number };
    };
    const first = loc.weekInfo?.firstDay;
    if (first == null) return 0;
    // weekInfo.firstDay uses 1–7 (Mon–Sun); normalize 7 → 0.
    return first === 1 ? 1 : 0;
  } catch {
    return 0;
  }
}

/** Parse an ISO date string (YYYY-MM-DD) into a local-midnight Date. */
function parseISODate(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00");
}

/** Format a Date as YYYY-MM-DD (local). */
function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Cache key for a given cursor month (YYYY-MM). */
function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** The first day of the month for a given Date. */
function firstOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

interface CalendarPageProps {
  /** Current date injected for testing; defaults to now. */
  now?: Date;
  /** Reminder window in days — events within this range get visual emphasis. */
  reminderDays?: number;
}

export default function CalendarPage({ now, reminderDays = 3 }: CalendarPageProps) {
  const { t, i18n } = useTranslation();
  const today = useMemo(() => (now ?? new Date()), [now]);

  const [cursor, setCursor] = useState<Date>(() => firstOfMonth(today));
  const [subsCache, setSubsCache] = useState<Map<string, Subscription[]>>(
    () => new Map()
  );
  const [loading, setLoading] = useState(true);
  const [openDay, setOpenDay] = useState<Date | null>(null);

  const key = monthKey(cursor);
  const cached = subsCache.get(key);

  const fetchMonth = useCallback(
    async (monthDate: Date, activeRef: { current: boolean }) => {
      const k = monthKey(monthDate);
      setLoading(true);
      try {
        const subs = await listSubscriptions();
        if (!activeRef.current) return;
        setSubsCache((prev) => {
          const next = new Map(prev);
          next.set(k, subs);
          return next;
        });
      } catch (err) {
        if (activeRef.current && isNonAuthError(err)) {
          toast({ title: t("errors.loadFailed"), variant: "destructive" });
        }
      } finally {
        if (activeRef.current) setLoading(false);
      }
    },
    [t]
  );

  // Fetch on mount and whenever the cursor month changes (cache miss only).
  useEffect(() => {
    if (subsCache.has(key)) {
      setLoading(false);
      return;
    }
    const active = { current: true };
    void fetchMonth(cursor, active);
    return () => {
      active.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // "No subscriptions at all" is true only after we have fetched at least one
  // month and every fetched month returned an empty list.
  const hasAnySubs = Array.from(subsCache.values()).some(
    (list) => list.length > 0
  );

  // Group active subs with a billing date in the visible month by ISO date.
  const eventsByDay = useMemo(() => {
    const map = new Map<string, Subscription[]>();
    if (!cached) return map;
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    for (const sub of cached) {
      if (sub.status !== "active" || !sub.next_billing_date) continue;
      const next = parseISODate(sub.next_billing_date);
      if (next.getFullYear() === year && next.getMonth() === month) {
        const iso = toISODate(next);
        const list = map.get(iso);
        if (list) list.push(sub);
        else map.set(iso, [sub]);
      }
    }
    return map;
  }, [cached, cursor]);

  const locale = i18n.language;
  const firstDay = getFirstDayOfWeek(locale);

  // Weekday header labels — 7 consecutive days starting at the first day.
  const weekdayLabels = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: "narrow" });
    const base = new Date(2024, 0, 7); // a Sunday
    const labels: string[] = [];
    for (let i = 0; i < WEEK_DAYS; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + firstDay + i);
      labels.push(fmt.format(d));
    }
    return labels;
  }, [locale, firstDay]);

  // Build the grid: 6 rows × 7 cols, covering the month plus leading/trailing blanks.
  const gridDays = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstOfMonthDate = new Date(year, month, 1);
    const offset = (firstOfMonthDate.getDay() - firstDay + WEEK_DAYS) % WEEK_DAYS;
    const start = new Date(year, month, 1 - offset);
    const days: Date[] = [];
    for (let i = 0; i < WEEK_DAYS * 6; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  }, [cursor, firstDay]);

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(
        cursor
      ),
    [locale, cursor]
  );

  const goPrev = () => {
    setOpenDay(null);
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1));
  };
  const goNext = () => {
    setOpenDay(null);
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1));
  };
  const goToday = () => {
    setOpenDay(null);
    setCursor(firstOfMonth(today));
  };

  const todayISO = toISODate(today);
  const monthHasEvents = eventsByDay.size > 0;

  return (
    <div className="space-y-6">
      {/* Title + month navigation — matches the "title left, actions right"
          pattern used by Dashboard / Subscriptions / Statistics. The month
          label sits at the center of the navigation as the current-view focal
          point, with prev/next flanking it and Today as a standalone action. */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold leading-tight tracking-[-0.01em]">
            {t("calendar.title")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("calendar.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" onClick={goPrev} aria-label={t("calendar.prevMonth")}>
            <ChevronLeft />
          </Button>
          <p
            className="px-2 font-heading text-base font-semibold tabular-nums"
            aria-live="polite"
          >
            {monthLabel}
          </p>
          <Button variant="outline" size="icon-sm" onClick={goNext} aria-label={t("calendar.nextMonth")}>
            <ChevronRight />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday} className="ml-1">
            <CalendarDays className="size-3.5" />
            {t("calendar.today")}
          </Button>
        </div>
      </div>

      {/* No subscriptions at all */}
      {!loading && subsCache.size > 0 && !hasAnySubs ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {t("calendar.noSubscriptions")}
          </p>
          <Button variant="outline" size="sm" render={<Link to="/" />}>
            {t("calendar.addFirst")}
          </Button>
        </div>
      ) : loading ? (
        <div
          className="space-y-2"
          role="status"
          aria-live="polite"
          aria-label={t("calendar.loadingLabel")}
        >
          <div className="grid grid-cols-7 gap-px">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="flex h-9 items-center justify-center"
              >
                <div className="h-3 w-6 rounded bg-muted/60 animate-pulse" />
              </div>
            ))}
          </div>
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="grid grid-cols-7 gap-px bg-border">
              {Array.from({ length: WEEK_DAYS * 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-24 bg-muted/30 animate-pulse"
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div role="grid" aria-label={monthLabel} className="space-y-2">
          {/* Weekday header row — sentence case, no eyebrow kicker */}
          <div role="row" className="grid grid-cols-7 gap-px">
            {weekdayLabels.map((label, i) => (
              <div
                key={i}
                role="columnheader"
                className="flex h-9 items-center justify-center px-2 text-xs font-medium text-muted-foreground"
              >
                {label}
              </div>
            ))}
          </div>

          {/* Day grid — single shared surface with divider lines */}
          <div className="overflow-hidden rounded-lg border border-border divide-y divide-border">
            {Array.from({ length: 6 }).map((_, weekIdx) => (
              <div
                key={weekIdx}
                role="row"
                className="grid grid-cols-7 gap-px bg-border"
              >
                {gridDays
                  .slice(weekIdx * WEEK_DAYS, weekIdx * WEEK_DAYS + WEEK_DAYS)
                  .map((day) => {
                    const iso = toISODate(day);
                    const inMonth = day.getMonth() === cursor.getMonth();
                    const isPast = inMonth && iso < todayISO;
                    const isToday = inMonth && iso === todayISO;
                    const events = eventsByDay.get(iso) ?? [];
                    const hasEvents = events.length > 0;
                    return (
                      <DayCell
                        key={iso}
                        day={day}
                        inMonth={inMonth}
                        isPast={isPast}
                        isToday={isToday}
                        events={events}
                        hasEvents={hasEvents}
                        openDay={openDay}
                        setOpenDay={setOpenDay}
                        reminderDays={reminderDays}
                        today={today}
                        t={t}
                        locale={locale}
                      />
                    );
                  })}
              </div>
            ))}
          </div>

          {/* Empty-month message */}
          {!loading && !monthHasEvents && cached && cached.length > 0 && (
            <p className="pt-4 text-center text-sm text-muted-foreground">
              {t("calendar.noBilling")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** A single day cell. Focusable + activatable when it has events. */
function DayCell({
  day,
  inMonth,
  isPast,
  isToday,
  events,
  hasEvents,
  openDay,
  setOpenDay,
  reminderDays,
  today,
  t,
  locale,
}: {
  day: Date;
  inMonth: boolean;
  isPast: boolean;
  isToday: boolean;
  events: Subscription[];
  hasEvents: boolean;
  openDay: Date | null;
  setOpenDay: (d: Date | null) => void;
  reminderDays: number;
  today: Date;
  t: (key: string, options?: Record<string, unknown>) => string;
  locale: string;
}) {
  const iso = toISODate(day);
  const isOpen = openDay && toISODate(openDay) === iso;

  const visibleEvents = events.slice(0, MAX_VISIBLE_EVENTS);
  const hiddenCount = events.length - visibleEvents.length;

  const triggerLabel = String(day.getDate());

  // Layered hierarchy via color + weight (DESIGN.md: "层级靠权重和尺寸"):
  //   out-of-month  → decorative background layer (no AA burden)
  //   past in-month → secondary info, readable but recessed
  //   future/today  → primary info, full foreground
  const numberClass = cn(
    "text-sm font-medium",
    !inMonth && "text-muted-foreground/50",
    isPast && inMonth && "text-muted-foreground"
  );

  // Today: solid primary fill — the strongest anchor on the grid.
  const numberSpan = isToday ? (
    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
      {triggerLabel}
    </span>
  ) : (
    <span className={numberClass}>{triggerLabel}</span>
  );

  const cellBase = cn(
    "relative min-h-20 p-2 text-left align-top transition-colors bg-background sm:min-h-24"
  );

  if (!hasEvents) {
    return (
      <div role="gridcell" className={cellBase} aria-disabled={!inMonth}>
        {numberSpan}
      </div>
    );
  }

  return (
    <Popover
      open={!!isOpen}
      onOpenChange={(open) => setOpenDay(open ? day : null)}
    >
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              cellBase,
              "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              isOpen && "bg-muted/60 ring-2 ring-inset ring-ring"
            )}
            aria-pressed={!!isOpen}
            aria-label={t("calendar.dayEvents", {
              count: events.length,
              date: triggerLabel,
            })}
          />
        }
      >
        {numberSpan}
        <div className="mt-1 space-y-0.5">
          {visibleEvents.map((sub) => (
            <EventMarker
              key={sub.id}
              sub={sub}
              isDueSoon={isDueWithin(sub.next_billing_date, reminderDays, today)}
            />
          ))}
          {hiddenCount > 0 && (
            <span className="block truncate rounded-md bg-pending/5 px-1 py-0.5 text-xs font-medium text-pending sm:text-[10px]">
              {t("calendar.more", { count: hiddenCount })}
            </span>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={4}>
        <DayPopover day={day} events={events} t={t} locale={locale} />
      </PopoverContent>
    </Popover>
  );
}

/** Compact event marker inside a day cell.
 *  Due-soon events get a stronger fill + ring to carry the "renewal-first"
 *  principle (PRODUCT.md §1) into the calendar; far-future events stay light. */
function EventMarker({
  sub,
  isDueSoon,
}: {
  sub: Subscription;
  isDueSoon: boolean;
}) {
  return (
    <span
      className={cn(
        "block truncate rounded-md px-1 py-0.5 text-xs font-medium text-pending sm:text-[10px]",
        isDueSoon
          ? "bg-pending/15 ring-1 ring-pending/25"
          : "bg-pending/10"
      )}
    >
      {sub.name}
    </span>
  );
}

/** Full event list shown in the popover for an open day. */
function DayPopover({
  day,
  events,
  t,
  locale,
}: {
  day: Date;
  events: Subscription[];
  t: (key: string, options?: Record<string, unknown>) => string;
  locale: string;
}) {
  const dateLabel = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
  }).format(day);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-muted-foreground">{dateLabel}</p>
      <ul className="flex flex-col gap-2" role="list">
        {events.map((sub) => (
          <li key={sub.id} className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium">{sub.name}</span>
              <span className="shrink-0 font-variant-numeric tabular-nums font-semibold">
                {formatCurrency(sub.price, sub.currency, locale)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {sub.category && (
                <Badge variant="secondary">{sub.category.name}</Badge>
              )}
              <Badge variant="pending">
                {formatDueLabel(sub.next_billing_date, t)}
              </Badge>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}