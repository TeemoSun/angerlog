import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

let appTz: string | null = null;

/** 应用全局时区（IANA 名），登录/恢复会话时由后端下发的 USER_TIMEZONE 注入。 */
export function setAppTimezone(tz: string | null) {
  appTz = tz;
}

/** 未注入时兜底浏览器本地时区。 */
export function appTimezone(): string {
  return appTz ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export interface WallParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function parseWall(parts: Intl.DateTimeFormatPart[]): WallParts {
  const get = (type: string) => {
    const p = parts.find((x) => x.type === type);
    if (!p) throw new Error(`Intl format missing part: ${type}`);
    return Number(p.value);
  };
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") % 24, // hourCycle 24 的 "24" 表示午夜
    minute: get("minute"),
    second: get("second"),
  };
}

/** 绝对时刻 → 指定时区下的墙钟时间（年/月/日/时/分/秒）。 */
export function wallParts(date: Date, tz: string = appTimezone()): WallParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return parseWall(fmt.formatToParts(date));
}

/**
 * 墙钟时间 → UTC 绝对时刻（毫秒）。
 * 不能用 Date.UTC 直接算（DST/历史偏移会错），用 Intl 墙钟比对迭代校正，至多 3 次收敛。
 */
export function wallTimeToUTC(wall: WallParts, tz: string = appTimezone()): number {
  let ms = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);
  for (let i = 0; i < 3; i++) {
    const got = wallParts(new Date(ms), tz);
    const want = [wall.year, wall.month, wall.day, wall.hour, wall.minute, wall.second];
    const have = [got.year, got.month, got.day, got.hour, got.minute, got.second];
    if (want.every((v, k) => v === have[k])) return ms;
    const wantMs = Date.UTC(want[0], want[1] - 1, want[2], want[3], want[4], want[5]);
    const haveMs = Date.UTC(have[0], have[1] - 1, have[2], have[3], have[4], have[5]);
    ms += wantMs - haveMs;
  }
  return ms;
}

/** 指定时区下"今天"的 00:00:00 墙钟时刻。 */
export function startOfTodayInTz(tz: string = appTimezone()): number {
  const now = wallParts(new Date(), tz);
  return wallTimeToUTC({ ...now, hour: 0, minute: 0, second: 0 }, tz);
}

/** 指定时区下本周（ISO 周一=1）周一的 00:00:00 墙钟时刻。 */
export function startOfThisWeekInTz(tz: string = appTimezone()): number {
  const today = startOfTodayInTz(tz);
  const wall = wallParts(new Date(today), tz);
  // 对墙钟日期本身（纯日历）求星期几，避免 UTC 换算后日期偏移一天
  const weekday = new Date(Date.UTC(wall.year, wall.month - 1, wall.day)).getUTCDay();
  const isoDay = weekday === 0 ? 7 : weekday;
  return today - (isoDay - 1) * 86400000;
}

function ymdStr(ms: number, tz: string): string {
  const p = wallParts(new Date(ms), tz);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function todayStr(): string {
  return ymdStr(Date.now(), appTimezone());
}

/** 指定时区下"今天往前 n 天"的墙钟日期字符串（YYYY-MM-DD），n=0 即今天。 */
export function daysAgoStr(n: number, tz: string = appTimezone()): string {
  const todayWall = wallParts(new Date(), tz);
  return ymdStr(wallTimeToUTC({ ...todayWall, day: todayWall.day - n }, tz), tz);
}

export function startOfThisWeekStr(): string {
  return ymdStr(startOfThisWeekInTz(), appTimezone());
}

export function startOfThisMonthStr(tz: string = appTimezone()): string {
  const now = wallParts(new Date(), tz);
  return ymdStr(wallTimeToUTC({ ...now, day: 1, hour: 0, minute: 0, second: 0 }, tz), tz);
}

export function startOfThisYearStr(tz: string = appTimezone()): string {
  const now = wallParts(new Date(), tz);
  return ymdStr(wallTimeToUTC({ ...now, month: 1, day: 1, hour: 0, minute: 0, second: 0 }, tz), tz);
}

export function formatDateTime(iso: string): string {
  const p = wallParts(new Date(iso), appTimezone());
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)} ${pad(p.hour)}:${pad(p.minute)}`;
}

export function formatDate(iso: string): string {
  const p = wallParts(new Date(iso), appTimezone());
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export const WEEKDAYS_CN = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

export function intensityColor(intensity: number): string {
  if (intensity <= 3) return "#f6d365";
  if (intensity <= 6) return "#fbbf24";
  if (intensity <= 8) return "#fb923c";
  return "#dc2626";
}

export function intensityLabel(intensity: number): string {
  if (intensity <= 3) return "生气";
  if (intensity <= 6) return "很生气";
  if (intensity <= 8) return "非常生气";
  return "特别生气";
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
