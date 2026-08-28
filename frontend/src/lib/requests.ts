import { api, type ApiErrorBody } from "@/lib/api";
import type {
  Envelope,
  HeatmapCell,
  LogItem,
  LogListParams,
  LoginResult,
  PageMeta,
  Summary,
  TrendPoint,
} from "@/lib/types";

export function unwrap<T>(payload: Envelope<T>): T {
  return payload.data;
}

export async function loginRequest(username: string, password: string): Promise<LoginResult> {
  const res = await api.post<Envelope<LoginResult>>("/auth/login", { username, password });
  return unwrap(res.data);
}

export async function logoutRequest(): Promise<void> {
  await api.post("/auth/logout", null);
}

export async function fetchLogs(params: LogListParams): Promise<{ items: LogItem[]; meta: PageMeta }> {
  const res = await api.get<Envelope<LogItem[]>>("/logs", { params });
  return { items: unwrap(res.data), meta: res.data.meta ?? { total: 0, page: 1, page_size: 20, has_next: false } };
}

export async function createLogRequest(body: {
  trigger_reason: string;
  intensity: number;
  category: string | null;
  created_at?: string;
}): Promise<LogItem> {
  const res = await api.post<Envelope<LogItem>>("/logs", body);
  return unwrap(res.data);
}

export async function resolveLogRequest(
  id: string,
  resolution_method: string,
  resolved_at?: string,
): Promise<LogItem> {
  const res = await api.put<Envelope<LogItem>>(`/logs/${id}`, {
    is_resolved: true,
    resolution_method,
    resolved_at,
  });
  return unwrap(res.data);
}

export async function deleteLogRequest(id: string): Promise<void> {
  await api.delete(`/logs/${id}`);
}

export async function fetchSummary(startDate?: string, endDate?: string): Promise<Summary> {
  const res = await api.get<Envelope<Summary>>("/stats/summary", {
    params: { start_date: startDate, end_date: endDate },
  });
  return unwrap(res.data);
}

export async function fetchTrend(
  granularity: "day" | "week" | "month",
  startDate?: string,
  endDate?: string,
): Promise<TrendPoint[]> {
  const res = await api.get<Envelope<TrendPoint[]>>("/stats/trend", {
    params: { granularity, start_date: startDate, end_date: endDate },
  });
  return unwrap(res.data);
}

export async function fetchHeatmap(startDate?: string, endDate?: string): Promise<HeatmapCell[]> {
  const res = await api.get<Envelope<HeatmapCell[]>>("/stats/heatmap", {
    params: { start_date: startDate, end_date: endDate },
  });
  return unwrap(res.data);
}

export async function fetchMe(): Promise<{ username: string; timezone: string; bottle_style: string }> {
  const res = await api.get<Envelope<{ username: string; timezone: string; bottle_style: string }>>("/auth/me");
  return unwrap(res.data);
}

export async function updateBottleStyleRequest(
  bottleStyle: string,
): Promise<{ bottle_style: string }> {
  const res = await api.put<Envelope<{ bottle_style: string }>>("/auth/bottle-style", {
    bottle_style: bottleStyle,
  });
  return unwrap(res.data);
}

export type { ApiErrorBody };
