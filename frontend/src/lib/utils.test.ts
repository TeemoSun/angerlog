import { describe, expect, it } from "vitest";

import {
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
    // 2026-08-25 是周二（Asia/Shanghai）
    setAppTimezone("Asia/Shanghai");
    const monday = startOfThisWeekInTz();
    const wall = wallParts(new Date(monday));
    expect(wall.day).toBe(24); // 2026-08-24 周一
  });
});
