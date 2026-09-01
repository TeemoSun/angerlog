import { describe, expect, it, vi } from "vitest";

import {
  daysAgoStr,
  setAppTimezone,
  startOfThisWeekInTz,
  wallParts,
  wallTimeToUTC,
} from "@/lib/utils";

describe("timezone utils", () => {
  it("wallTimeToUTC 与 wallParts 在 Asia/Shanghai 下往返一致", () => {
    setAppTimezone("Asia/Shanghai");
    const ms = wallTimeToUTC({ year: 2026, month: 8, day: 10, hour: 0, minute: 0, second: 0 });
    expect(new Date(ms).toISOString()).toBe("2026-08-09T16:00:00.000Z");
    expect(wallParts(new Date(ms))).toEqual({
      year: 2026,
      month: 8,
      day: 10,
      hour: 0,
      minute: 0,
      second: 0,
    });
  });

  it("wallTimeToUTC 在 America/New_York（夏令时）下正确换算", () => {
    setAppTimezone("America/New_York");
    // 2026-08-10 EDT（UTC-4）
    const ms = wallTimeToUTC({ year: 2026, month: 8, day: 10, hour: 12, minute: 0, second: 0 });
    expect(new Date(ms).toISOString()).toBe("2026-08-10T16:00:00.000Z");
    // 2026-01-15 EST（UTC-5）
    const winter = wallTimeToUTC({ year: 2026, month: 1, day: 15, hour: 12, minute: 0, second: 0 });
    expect(new Date(winter).toISOString()).toBe("2026-01-15T17:00:00.000Z");
    expect(wallParts(new Date(ms))).toMatchObject({ month: 8, day: 10, hour: 12 });
  });

  it("本周周一按配置时区计算（周一=ISO 语义）", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-25T08:00:00.000Z")); // 2026-08-25 是周二（Asia/Shanghai 16:00）
    try {
      setAppTimezone("Asia/Shanghai");
      const monday = startOfThisWeekInTz();
      const wall = wallParts(new Date(monday));
      expect(wall.day).toBe(24); // 2026-08-24 周一
    } finally {
      vi.useRealTimers();
    }
  });

  it("daysAgoStr 按配置时区的墙钟日期计算", () => {
    setAppTimezone("Asia/Shanghai");
    const today = daysAgoStr(0);
    const yesterday = daysAgoStr(1);
    const parsedToday = new Date(`${today}T00:00:00`);
    const parsedYesterday = new Date(`${yesterday}T00:00:00`);
    expect(parsedToday.getTime() - parsedYesterday.getTime()).toBe(86400000);
    // 与 wallParts 的墙钟日期一致（当前时刻在上海 00:00-08:00 时，UTC 已是前一天，也不应串日期）
    const wall = wallParts(new Date());
    const pad = (n: number) => String(n).padStart(2, "0");
    expect(today).toBe(`${wall.year}-${pad(wall.month)}-${pad(wall.day)}`);
  });
});
