import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { errorMessage } from "@/lib/api";
import { fetchHeatmap, fetchSummary, fetchTrend } from "@/lib/requests";
import type { HeatmapCell, Summary, TrendPoint } from "@/lib/types";
import { daysAgoStr, startOfThisWeekStr, todayStr, WEEKDAYS_CN } from "@/lib/utils";

const CATEGORY_COLOR_MAP: Record<string, string> = {
  工作: "#f6d365",
  家庭: "#fbbf24",
  交通: "#fb923c",
  社交: "#ef4444",
  其他: "#94a3b8",
};
const FALLBACK_COLORS = ["#f6d365", "#fbbf24", "#fb923c", "#ef4444", "#a78bfa", "#94a3b8"];

function getCategoryColor(name: string, index: number): string {
  return CATEGORY_COLOR_MAP[name] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

type PeriodKey = "week" | "month" | "year" | "custom";

const PERIOD_KEYS: PeriodKey[] = ["week", "month", "year", "custom"];
const PERIOD_LABELS: Record<PeriodKey, string> = {
  week: "本周",
  month: "本月",
  year: "本年",
  custom: "自定义",
};

export function StatsPanel() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapCell[]>([]);
  const [granularity, setGranularity] = useState<"day" | "week" | "month">("day");
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [customStart, setCustomStart] = useState<string>(() => daysAgoStr(6));
  const [customEnd, setCustomEnd] = useState<string>(() => todayStr());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const range = useMemo(() => {
    switch (period) {
      case "week":
        return { start: startOfThisWeekStr(), end: todayStr() };
      case "month":
        return { start: daysAgoStr(29), end: todayStr() };
      case "year":
        return { start: daysAgoStr(364), end: todayStr() };
      case "custom": {
        let start = customStart || todayStr();
        let end = customEnd || todayStr();
        if (start > end) [start, end] = [end, start];
        return { start, end };
      }
    }
  }, [period, customStart, customEnd]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [sum, tr, hm] = await Promise.all([
        fetchSummary(range.start, range.end),
        fetchTrend(granularity, range.start, range.end),
        fetchHeatmap(range.start, range.end),
      ]);
      setSummary(sum);
      setTrend(tr);
      setHeatmap(hm);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [granularity, range]);

  useEffect(() => {
    load();
  }, [load]);

  const cellMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const cell of heatmap) {
      map.set(`${cell.day_of_week}_${cell.hour_of_day}`, cell.count);
    }
    return map;
  }, [heatmap]);

  const maxCount = useMemo(() => heatmapMax(heatmap), [heatmap]);

  const categoryEntries = useMemo(() => {
    if (!summary) return [];
    return Object.entries(summary.category_counts).map(([name, value], i) => ({
      name,
      value,
      fill: getCategoryColor(name, i),
    }));
  }, [summary]);

  const totalCategoryCount = useMemo(() => {
    return categoryEntries.reduce((acc, cur) => acc + cur.value, 0);
  }, [categoryEntries]);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex justify-center sm:justify-start">
        <div className="flex gap-1 rounded-full border border-glass-border bg-glass p-1">
          {PERIOD_KEYS.map((p) => (
            <Button
              key={p}
              size="sm"
              variant={period === p ? "secondary" : "ghost"}
              onClick={() => setPeriod(p)}
              className={
                "rounded-full text-xs " +
                (period === p
                  ? "bg-star-amber/20 text-star-amber ring-1 ring-star-amber/40"
                  : "text-milk-dim hover:text-milk")
              }
            >
              {PERIOD_LABELS[p]}
            </Button>
          ))}
        </div>
      </div>

      {period === "custom" && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-star-amber/40 bg-star-amber/10 px-3 py-2.5">
          <span className="text-xs text-milk-dim">从</span>
          <input
            type="date"
            value={customStart}
            max={customEnd}
            onChange={(e) => setCustomStart(e.target.value)}
            aria-label="自定义开始日期"
            className="rounded-lg border border-glass-border bg-glass px-2 py-1 text-xs text-milk [color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-star-amber/60"
          />
          <span className="text-xs text-milk-dim">至</span>
          <input
            type="date"
            value={customEnd}
            min={customStart}
            max={todayStr()}
            onChange={(e) => setCustomEnd(e.target.value)}
            aria-label="自定义结束日期"
            className="rounded-lg border border-glass-border bg-glass px-2 py-1 text-xs text-milk [color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-star-amber/60"
          />
          <span className="ml-auto hidden text-[10px] text-milk-dim/70 sm:inline">
            共 {Math.round((Date.parse(customEnd || todayStr()) - Date.parse(customStart || todayStr())) / 86400000) + 1} 天
          </span>
        </div>
      )}

      {error && (
        <Card className="border-star-red/30 bg-star-red/10">
          <CardContent className="py-3 text-sm text-star-red/90">{error}</CardContent>
        </Card>
      )}

      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard label="生气次数" value={String(summary.total_count)} />
          <SummaryCard
            label="平均强度"
            value={summary.avg_intensity == null ? "—" : summary.avg_intensity.toFixed(1)}
          />
          <SummaryCard
            label="最高强度"
            value={summary.max_intensity == null ? "—" : String(summary.max_intensity)}
          />
          <SummaryCard
            label="解决率"
            value={summary.resolve_rate == null ? "—" : `${Math.round(summary.resolve_rate * 100)}%`}
          />
        </div>
      )}

      <Card className="min-w-0 border-glass-border bg-glass backdrop-blur-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl text-paper">趋势</CardTitle>
            <CardDescription>所选周期内记录次数</CardDescription>
          </div>
          <div className="flex gap-1 rounded-full border border-glass-border bg-glass p-1">
            {(["day", "week", "month"] as const).map((g) => (
              <Button
                key={g}
                size="sm"
                variant={granularity === g ? "secondary" : "ghost"}
                onClick={() => setGranularity(g)}
                className={
                  "rounded-full text-xs " +
                  (granularity === g
                    ? "bg-star-amber/20 text-star-amber ring-1 ring-star-amber/40"
                    : "text-milk-dim hover:text-milk")
                }
              >
                {g === "day" ? "日" : g === "week" ? "周" : "月"}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="pb-4 pt-0">
          {loading ? (
            <div className="flex h-44 items-center justify-center text-sm text-milk-dim">
              加载中…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={trend} margin={{ top: 12, right: 12, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                  vertical={false}
                />
                <XAxis
                  dataKey="period"
                  tickLine={false}
                  axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                  tick={{ fill: "#c9bfa8", fontSize: 10 }}
                  dy={4}
                  height={22}
                />
                <YAxis
                  allowDecimals={false}
                  width={28}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#c9bfa8", fontSize: 11 }}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="次数"
                  stroke="#fbbf24"
                  strokeWidth={2.5}
                  fill="url(#trendGradient)"
                  dot={{ r: 3.5, fill: "#fbbf24", stroke: "#0b0a1a", strokeWidth: 2 }}
                  activeDot={{ r: 5.5, fill: "#f6d365", stroke: "#0b0a1a", strokeWidth: 2 }}
                  style={{ filter: "drop-shadow(0 0 6px rgba(251,191,36,0.45))" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="min-w-0 border-glass-border bg-glass backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-xl text-paper">分类分布</CardTitle>
            <CardDescription>各类别的记录次数</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryEntries.length > 0 ? (
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
                {/* 环形图容器与中心统计 */}
                <div className="relative flex h-44 w-44 shrink-0 items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryEntries}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={72}
                        paddingAngle={categoryEntries.length > 1 ? 4 : 0}
                        stroke="none"
                      >
                        {categoryEntries.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] text-milk-dim">总计</span>
                    <span className="text-xl font-bold text-paper drop-shadow-sm">
                      {totalCategoryCount}
                    </span>
                    <span className="text-[10px] text-milk-dim/70">次记录</span>
                  </div>
                </div>

                {/* 分类图例与占比列表 */}
                <div className="flex w-full flex-1 flex-col justify-center gap-2.5">
                  {categoryEntries.map((item) => {
                    const percent =
                      totalCategoryCount > 0
                        ? Math.round((item.value / totalCategoryCount) * 100)
                        : 0;
                    return (
                      <div key={item.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full shadow-[0_0_6px_rgba(255,255,255,0.15)]"
                            style={{ backgroundColor: item.fill }}
                          />
                          <span className="font-medium text-paper">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-milk-dim">{item.value} 次</span>
                          <span className="w-10 text-right font-mono text-[11px] font-semibold text-star-amber">
                            {percent}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-milk-dim">暂无分类数据</p>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 border-glass-border bg-glass backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-xl text-paper">高频时段</CardTitle>
            <CardDescription>星期 × 小时</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-48 items-center justify-center text-sm text-milk-dim">
                加载中…
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {/* 顶部小时刻度 */}
                <div className="flex items-center gap-1.5 pb-0.5">
                  <div className="w-7 shrink-0 sm:w-8" />
                  <div
                    className="grid flex-1 gap-1"
                    style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
                  >
                    {HOURS.map((h) => (
                      <div
                        key={h}
                        className="select-none text-center font-mono text-[9px] leading-none text-milk-dim/70"
                      >
                        {h % 4 === 0 ? String(h).padStart(2, "0") : ""}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 星期行（周一 ~ 周日，每行 24 个小时） */}
                {WEEKDAYS_CN.map((d, dayIdx) => {
                  const dayOfWeek = dayIdx + 1;
                  return (
                    <div key={d} className="flex items-center gap-1.5">
                      <div className="w-7 shrink-0 select-none text-left text-[10px] font-medium leading-none text-milk-dim sm:w-8 sm:text-[11px]">
                        {d}
                      </div>
                      <div
                        className="grid flex-1 gap-1"
                        style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
                      >
                        {HOURS.map((hour) => {
                          const count = cellMap.get(`${dayOfWeek}_${hour}`) ?? 0;
                          return (
                            <HeatmapSquare
                              key={hour}
                              count={count}
                              max={maxCount}
                              label={`${d} ${String(hour).padStart(2, "0")}:00`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* 底部图例 */}
                <div className="flex select-none items-center justify-end gap-1.5 pt-3 text-[10px] text-milk-dim/70">
                  <span>少</span>
                  <div className="flex items-center gap-1">
                    <div
                      className="h-2.5 w-2.5 rounded-[2px] border border-white/[0.06] bg-white/[0.04]"
                      title="无记录"
                    />
                    <div
                      className="h-2.5 w-2.5 rounded-[2px] border border-star-gold/50 bg-star-gold/35 shadow-[0_0_4px_rgba(246,211,101,0.2)]"
                      title="较少"
                    />
                    <div
                      className="h-2.5 w-2.5 rounded-[2px] border border-star-amber/70 bg-star-amber/60 shadow-[0_0_6px_rgba(251,191,36,0.35)]"
                      title="中等"
                    />
                    <div
                      className="h-2.5 w-2.5 rounded-[2px] border border-star-orange/85 bg-star-orange/80 shadow-[0_0_8px_rgba(251,146,60,0.45)]"
                      title="较多"
                    />
                    <div
                      className="h-2.5 w-2.5 rounded-[2px] border border-star-red bg-star-red/95 shadow-[0_0_10px_rgba(239,68,68,0.6)]"
                      title="频繁"
                    />
                  </div>
                  <span>多</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-glass-border bg-glass text-center backdrop-blur-xl">
      <CardContent className="flex flex-col gap-1 py-5">
        <span className="text-xs text-milk-dim">{label}</span>
        <span className="text-3xl font-bold text-star-amber drop-shadow-sm">{value}</span>
      </CardContent>
    </Card>
  );
}

function heatmapMax(cells: HeatmapCell[]): number {
  return cells.reduce((m, c) => Math.max(m, c.count), 1);
}

function getHeatmapStyle(count: number, max: number): React.CSSProperties {
  if (count <= 0) {
    return {
      backgroundColor: "rgba(255, 255, 255, 0.04)",
      borderColor: "rgba(255, 255, 255, 0.06)",
    };
  }
  const ratio = Math.max(0, Math.min(1, count / max));
  if (ratio <= 0.25) {
    return {
      backgroundColor: "rgba(246, 211, 101, 0.35)",
      borderColor: "rgba(246, 211, 101, 0.55)",
      boxShadow: "0 0 5px rgba(246, 211, 101, 0.25)",
    };
  }
  if (ratio <= 0.5) {
    return {
      backgroundColor: "rgba(251, 191, 36, 0.6)",
      borderColor: "rgba(251, 191, 36, 0.8)",
      boxShadow: "0 0 7px rgba(251, 191, 36, 0.4)",
    };
  }
  if (ratio <= 0.75) {
    return {
      backgroundColor: "rgba(251, 146, 60, 0.8)",
      borderColor: "rgba(251, 146, 60, 0.95)",
      boxShadow: "0 0 9px rgba(251, 146, 60, 0.5)",
    };
  }
  return {
    backgroundColor: "rgba(239, 68, 68, 0.95)",
    borderColor: "rgba(248, 113, 113, 1)",
    boxShadow: "0 0 12px rgba(239, 68, 68, 0.65)",
  };
}

function HeatmapSquare({
  count,
  max,
  label,
}: {
  count: number;
  max: number;
  label: string;
}) {
  return (
    <div
      className="aspect-square w-full cursor-pointer rounded-[2px] border transition-all duration-150 hover:z-10 hover:scale-125"
      style={getHeatmapStyle(count, max)}
      title={count === 0 ? `${label} · 无记录` : `${label} · ${count} 次记录`}
      data-testid="heatmap-cell"
    />
  );
}

interface TooltipPayloadItem {
  name?: string;
  value?: number | string;
  color?: string;
  payload?: {
    fill?: string;
    [key: string]: unknown;
  };
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-xl border border-glass-border bg-night-900/95 px-3 py-2 text-xs shadow-xl backdrop-blur-md">
      {label && <div className="mb-1 font-mono text-[11px] text-milk-dim">{label}</div>}
      <div className="flex flex-col gap-1">
        {payload.map((item, idx) => {
          const color = item.payload?.fill || item.color || "#fbbf24";
          return (
            <div key={idx} className="flex items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-milk-dim">{item.name}:</span>
              <span className="font-semibold text-paper">{item.value} 次</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
