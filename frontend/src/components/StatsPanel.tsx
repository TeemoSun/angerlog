import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
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

const CATEGORY_COLORS = ["#f6d365", "#fbbf24", "#fb923c", "#ef4444", "#dc2626"];

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

  const heatmapRows = useHeatmapRows(heatmap);

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
        <CardContent>
          {loading ? (
            <div className="flex h-48 items-center justify-center text-sm text-milk-dim">
              加载中…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trend} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="period" tick={{ fill: "#c9bfa8", fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: "#c9bfa8", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(15,23,42,0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    color: "#e2e8f0",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="次数"
                  stroke="#fbbf24"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#fbbf24", stroke: "#0b0a1a", strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: "#f6d365" }}
                  style={{ filter: "drop-shadow(0 0 6px rgba(251,191,36,0.5))" }}
                />
              </LineChart>
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
            {summary && Object.keys(summary.category_counts).length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={Object.entries(summary.category_counts).map(([name, value], i) => ({
                      name,
                      value,
                      fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                    }))}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {Object.entries(summary.category_counts).map(([name], i) => (
                      <Cell key={name} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "rgba(15,23,42,0.95)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 12,
                      color: "#e2e8f0",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-sm text-milk-dim">暂无分类数据</p>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 border-glass-border bg-glass backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-xl text-paper">高频时段</CardTitle>
            <CardDescription>星期 × 小时 · 按用户时区</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-48 items-center justify-center text-sm text-milk-dim">
                加载中…
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <div className="w-8 shrink-0" />
                  {WEEKDAYS_CN.map((d) => (
                    <div key={d} className="flex-1 text-center text-[10px] text-milk-dim">
                      {d}
                    </div>
                  ))}
                </div>
                {Array.from({ length: 24 }, (_, hour) => (
                  <div key={hour} className="flex items-center gap-1">
                    <div className="w-8 shrink-0 text-right text-[10px] leading-none text-milk-dim/70">
                      {hour % 4 === 0 ? String(hour).padStart(2, "0") : ""}
                    </div>
                    {WEEKDAYS_CN.map((d, dayIdx) => {
                      const cell = heatmapRows[hour].find((c) => c.day_of_week === dayIdx + 1);
                      const count = cell?.count ?? 0;
                      return (
                        <HeatmapSquare
                          key={d}
                          count={count}
                          max={heatmapMax(heatmap)}
                          label={`${d} ${String(hour).padStart(2, "0")}时`}
                        />
                      );
                    })}
                  </div>
                ))}
                <div className="flex items-center justify-end gap-1 pt-1">
                  <span className="text-[10px] text-milk-dim/70">少</span>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: heatColor(i, 4) }} />
                  ))}
                  <span className="text-[10px] text-milk-dim/70">多</span>
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

function useHeatmapRows(cells: HeatmapCell[]): Record<number, HeatmapCell[]> {
  const rows: Record<number, HeatmapCell[]> = {};
  for (let h = 0; h < 24; h++) rows[h] = [];
  for (const cell of cells) {
    rows[cell.hour_of_day]?.push(cell);
  }
  return rows;
}

function heatmapMax(cells: HeatmapCell[]): number {
  return cells.reduce((m, c) => Math.max(m, c.count), 1);
}

function heatColor(level: number, max: number): string {
  if (level <= 0) return "rgba(148,163,184,0.15)";
  const t = Math.max(0, Math.min(1, level / max));
  return `rgba(239,68,68,${0.25 + 0.75 * t})`;
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
      className="aspect-square w-full min-w-2.5 max-w-3.5 flex-1 rounded-[3px]"
      style={{ backgroundColor: heatColor(count, max) }}
      title={count === 0 ? `${label} 无记录` : `${label} ${count}次`}
      data-testid="heatmap-cell"
    />
  );
}
