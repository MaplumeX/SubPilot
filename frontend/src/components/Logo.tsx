import { cn } from "@/lib/utils";

/**
 * SubPilot logo mark — a radar / pilot scope.
 * Outer ring + sweep pointer + center hub. Conveys the "Pilot" in SubPilot:
 * scanning the horizon for upcoming renewals and guiding attention.
 * Stays flat (no shadow) per DESIGN.md elevation rules.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground",
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none">
        <circle
          cx="12"
          cy="12"
          r="7.5"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M12 12L16.8 7.2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="12" cy="12" r="1.8" fill="currentColor" />
      </svg>
    </span>
  );
}
