import axios, { type InternalAxiosRequestConfig } from "axios";

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retriedAfterRefresh?: boolean;
};

type TokenResponse = {
  access_token: string;
  refresh_token: string;
};

let refreshPromise: Promise<string> | null = null;

function clearTokensAndRedirect() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  window.location.assign("/login");
}

function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) return Promise.reject(new Error("No refresh token"));

  refreshPromise = axios
    .post<TokenResponse>("/api/v1/auth/refresh", { refresh_token: refreshToken })
    .then(({ data }) => {
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      return data.access_token;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

const api = axios.create({
  baseURL: "/api/v1",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config as RetriableRequestConfig | undefined;
    const isAuthRequest = request?.url === "/auth/login" || request?.url === "/auth/register";

    if (
      error.response?.status === 401 &&
      request &&
      !request._retriedAfterRefresh &&
      !isAuthRequest
    ) {
      request._retriedAfterRefresh = true;
      try {
        const accessToken = await refreshAccessToken();
        request.headers.Authorization = `Bearer ${accessToken}`;
        return api(request);
      } catch {
        clearTokensAndRedirect();
      }
    } else if (error.response?.status === 401) {
      clearTokensAndRedirect();
    }
    return Promise.reject(error);
  }
);

export default api;
