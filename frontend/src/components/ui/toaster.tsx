import { useEffect, useState, useCallback } from "react";
import { AlertCircle, Check } from "lucide-react";
import { subscribe, type Toast } from "./toast-store";

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const fn = (t: Toast) => {
      setItems((prev) => [...prev, t]);
      window.setTimeout(() => remove(t.id), 4000);
    };
    return subscribe(fn);
  }, [remove]);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4"
    >
      {items.map((t) => {
        const destructive = t.variant === "destructive";
        return (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex max-w-sm items-start gap-3 rounded-lg bg-popover px-4 py-3 text-sm text-popover-foreground ring-1 ring-foreground/10 shadow-sm animate-in fade-in-0 slide-in-from-bottom-2 duration-200"
          >
            {destructive ? (
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
            ) : (
              <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
            )}
            <div className="min-w-0">
              <p className="font-medium">{t.title}</p>
              {t.message && (
                <p className="mt-0.5 text-muted-foreground">{t.message}</p>
              )}
            </div>
            {t.action && (
              <button
                type="button"
                onClick={() => { t.action!.onClick(); remove(t.id); }}
                className="shrink-0 text-sm font-medium text-primary hover:underline underline-offset-4 ml-1"
              >
                {t.action.label}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
