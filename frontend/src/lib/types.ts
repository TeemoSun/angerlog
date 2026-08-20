export type Category = "工作" | "家庭" | "交通" | "社交" | "其他";

export const CATEGORIES: Category[] = ["工作", "家庭", "交通", "社交", "其他"];

export interface LogItem {
  id: string;
  trigger_reason: string;
  intensity: number;
  category: Category | null;
  is_resolved: boolean;
  resolution_method: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface PageMeta {
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
}

export interface LogListParams {
  page?: number;
  page_size?: number;
  intensity_min?: number;
  intensity_max?: number;
  category?: string;
  resolved?: boolean;
}

export interface Summary {
  total_count: number;
  avg_intensity: number | null;
  max_intensity: number | null;
  min_intensity: number | null;
  resolved_count: number;
  resolve_rate: number | null;
  category_counts: Record<string, number>;
}

export interface TrendPoint {
  period: string;
  count: number;
  avg_intensity: number | null;
}

export interface HeatmapCell {
  day_of_week: number;
  hour_of_day: number;
  count: number;
}

export interface LoginResult {
  csrf_token: string;
  username: string;
}

export interface Envelope<T> {
  code: number;
  message: string;
  data: T;
  meta?: PageMeta;
}
