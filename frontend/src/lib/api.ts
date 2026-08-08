import axios, { AxiosError, AxiosRequestConfig } from "axios";
import {
  ACCESS_STORAGE_KEY,
  type ApiResponse,
} from "@hrms/shared";

const apiConfigured = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000").replace(/\/+$/, "");
export const API_URL = apiConfigured.toLowerCase().endsWith("/api")
  ? apiConfigured
  : `${apiConfigured}/api`;

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_STORAGE_KEY);
}

export function setAccessToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(ACCESS_STORAGE_KEY, token);
  else window.localStorage.removeItem(ACCESS_STORAGE_KEY);
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<ApiResponse<{ accessToken: string }>>(`${API_URL}/auth/refresh`, null, {
        withCredentials: true,
      })
      .then((res) => {
        const token = res.data.data?.accessToken ?? null;
        setAccessToken(token);
        return token;
      })
      .catch(() => {
        setAccessToken(null);
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const original = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined;

    const isAuthCall =
      original?.url?.includes("/auth/login") ||
      original?.url?.includes("/auth/refresh") ||
      original?.url?.includes("/auth/logout") ||
      original?.url?.includes("/auth/forgot-password") ||
      original?.url?.includes("/auth/reset-password");

    if (
      error.response?.status === 401 &&
      original &&
      !original._retried &&
      !isAuthCall &&
      typeof window !== "undefined"
    ) {
      original._retried = true;
      const token = await refreshAccessToken();
      if (token) {
        original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
        return api(original);
      }
      window.location.replace("/login");
      return Promise.reject(error);
    }

    return Promise.reject(error);
  },
);

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiResponse<unknown> | undefined;
    if (data?.message) return data.message;
    if (error.code === "ERR_NETWORK") return "Cannot reach the server. Is the backend running?";
    return error.message || "Something went wrong";
  }
  return error instanceof Error ? error.message : "Something went wrong";
}

export async function downloadPdf(url: string): Promise<void> {
  const token = getAccessToken();
  const response = await api.get(url, {
    responseType: "blob",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
  const disposition = response.headers?.["content-disposition"] as string | undefined;
  const match = disposition?.match(/filename="?([^"]+)"?/);
  const downloadName = match?.[1] ?? (url.split("/").pop() ?? "document.pdf");
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = downloadName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(blobUrl);
}

export async function openPdf(url: string): Promise<void> {
  const token = getAccessToken();
  const response = await api.get(url, {
    responseType: "blob",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
  window.open(blobUrl, "_blank");
}
