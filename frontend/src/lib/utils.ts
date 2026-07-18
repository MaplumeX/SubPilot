import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { AxiosError } from "axios"
import { toast } from "@/components/ui/toast-store"
import type { TFunction } from "i18next"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns true for non-auth errors — i.e. errors worth surfacing to the user.
 * 401 is handled by the response interceptor (redirects to /login), so
 * catch blocks should silently ignore it and only toast real failures.
 */
export function isNonAuthError(err: unknown): boolean {
  return (err as AxiosError)?.response?.status !== 401;
}

/**
 * Surface an axios error with a specific, actionable toast message.
 * Maps network/403/404/500 to distinct i18n keys; falls back to loadFailed.
 */
export function toastError(err: unknown, t: TFunction): void {
  if (!isNonAuthError(err)) return;
  const status = (err as AxiosError)?.response?.status;
  let key: string;
  if (!status) {
    key = "errors.networkError";
  } else if (status === 403) {
    key = "errors.forbidden";
  } else if (status === 404) {
    key = "errors.notFound";
  } else if (status >= 500) {
    key = "errors.serverError";
  } else {
    key = "errors.loadFailed";
  }
  toast({ title: t(key), variant: "destructive" });
}
