import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayStr(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function startOfThisWeekStr(): string {
  const d = new Date();
  const isoDay = d.getDay() === 0 ? 7 : d.getDay();
  d.setDate(d.getDate() - (isoDay - 1));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const WEEKDAYS_CN = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

export function intensityColor(intensity: number): string {
  if (intensity <= 3) return "#fde68a";
  if (intensity <= 6) return "#fbbf24";
  if (intensity <= 8) return "#fb923c";
  return "#dc2626";
}

export function intensityDescription(intensity: number): string {
  if (intensity <= 3) return "有点烦";
  if (intensity <= 6) return "挺生气";
  if (intensity <= 8) return "很愤怒";
  return "爆发边缘";
}

export function formatIntensity(value: number): string {
  return `${value}/10`;
}
