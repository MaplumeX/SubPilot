import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { AxiosError } from "axios"

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
