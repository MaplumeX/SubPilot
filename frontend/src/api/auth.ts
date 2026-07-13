import api from "./client";
import type { TokenResponse, UserResponse } from "./types";

export async function register(
  email: string,
  password: string,
  locale?: string
): Promise<TokenResponse> {
  const { data } = await api.post<TokenResponse>("/auth/register", {
    email,
    password,
    locale,
  });
  return data;
}

export async function login(
  email: string,
  password: string
): Promise<TokenResponse> {
  const { data } = await api.post<TokenResponse>("/auth/login", {
    email,
    password,
  });
  return data;
}

export async function refreshToken(
  refresh_token: string
): Promise<TokenResponse> {
  const { data } = await api.post<TokenResponse>("/auth/refresh", {
    refresh_token,
  });
  return data;
}

export async function getMe(): Promise<UserResponse> {
  const { data } = await api.get<UserResponse>("/auth/me");
  return data;
}

export async function updateLocale(locale: string): Promise<UserResponse> {
  const { data } = await api.patch<UserResponse>("/auth/me/locale", null, {
    params: { locale },
  });
  return data;
}

export async function updateBaseCurrency(currency: string): Promise<UserResponse> {
  const { data } = await api.patch<UserResponse>("/auth/me/base-currency", null, {
    params: { currency },
  });
  return data;
}
