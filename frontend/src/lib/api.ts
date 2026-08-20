import type { AxiosError, AxiosRequestConfig } from "axios";
import axios from "axios";

import { useAuthStore } from "@/stores/auth";

export interface ApiErrorBody {
  code: number;
  message: string;
  data: unknown;
}

export class ApiClientError extends Error {
  code: number;
  status: number;
  data: unknown;

  constructor(code: number, message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
    this.data = data;
  }
}

export const ERROR_ACCESS_EXPIRED = 40102;
export const ERROR_REFRESH_EXPIRED = 40103;
export const ERROR_CSRF = 40301;

export function isApiError(err: unknown): err is ApiClientError {
  return err instanceof ApiClientError;
}

export function errorMessage(err: unknown): string {
  if (isApiError(err)) return err.message;
  if (err instanceof Error) return err.message;
  return "网络异常，请稍后重试";
}

function toApiError(err: AxiosError): ApiClientError {
  const body = err.response?.data as ApiErrorBody | undefined;
  if (body && typeof body.code === "number" && typeof body.message === "string") {
    return new ApiClientError(body.code, body.message, err.response?.status ?? 0, body.data);
  }
  return new ApiClientError(-1, err.message || "请求失败", err.response?.status ?? 0, undefined);
}

export const api = axios.create({
  baseURL: "/api/v1",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const csrf = useAuthStore.getState().csrfToken;
  const method = (config.method ?? "get").toLowerCase();
  if (csrf && ["post", "put", "patch", "delete"].includes(method)) {
    config.headers.set("X-CSRF-Token", csrf);
  }
  return config;
});

let refreshing: Promise<void> | null = null;

interface CustomRequestConfig extends AxiosRequestConfig {
  skipAuthRefresh?: boolean;
  _retried?: boolean;
}

async function performRefresh(): Promise<void> {
  const res = await api.post("/auth/refresh", null, {
    skipAuthRefresh: true,
    headers: { "Content-Type": "application/json" },
  } as CustomRequestConfig);
  const body = res.data as { data?: { csrf_token?: string } } | undefined;
  const token = body?.data?.csrf_token;
  if (!token) {
    throw new Error("refresh response missing csrf_token");
  }
  useAuthStore.getState().setCsrfToken(token);
}

let restorePromise: Promise<boolean> | null = null;

export async function tryRestoreSession(): Promise<boolean> {
  restorePromise = restorePromise ?? (async () => {
    try {
      await performRefresh();
      return true;
    } catch {
      useAuthStore.getState().clear();
      return false;
    } finally {
      restorePromise = null;
    }
  })();
  return restorePromise;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as CustomRequestConfig | undefined;

    if (!original || original.skipAuthRefresh || original._retried) {
      return Promise.reject(toApiError(error));
    }

    const status = error.response?.status;
    const body = error.response?.data as ApiErrorBody | undefined;
    if (status === 401 && body?.code === ERROR_ACCESS_EXPIRED) {
      original._retried = true;
      try {
        refreshing = refreshing ?? performRefresh();
        await refreshing;
      } catch {
        refreshing = null;
        useAuthStore.getState().onSessionExpired();
        return Promise.reject(toApiError(error));
      } finally {
        refreshing = null;
      }
      return api(original);
    }

    return Promise.reject(toApiError(error));
  },
);
