import { useCallback, useEffect, useState } from "react";
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
import { startOfThisWeekStr, todayStr, WEEKDAYS_CN } from "@/lib/utils";

const CATEGORY_COLORS = ["#f59e0b", "#fbbf24", "#f97316", "#34d399", "#60a5fa"];

export function StatsPanel() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapCell[]>([]);
  const [granularity, setGranularity] = useState<"day" | "week" | "month">("day");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const weekStart = startOfThisWeekStr();
      const today = todayStr();
      const [sum, tr, hm] = await Promise.all([
        fetchSummary(weekStart, today),
        fetchTrend(granularity, weekStart, today),
        fetchHeatmap(weekStart, today),
      ]);
      setSummary(sum);
      setTrend(tr);
      setHeatmap(hm);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [granularity]);

  useEffect(() => {
    load();
  }, [load]);

  const heatmapRows = useHeatmapRows(heatmap);

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <Card className="border-red-500/30 bg-red-500/10">
          <CardContent className="py-3 text-sm text-red-300">{error}</CardContent>
        </Card>
      )}

      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard label="本周生气" value={String(summary.total_count)} />
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>趋势</CardTitle>
            <CardDescription>本周期内记录次数与平均强度</CardDescription>
          </div>
          <div className="flex gap-1">
            {(["day", "week", "month"] as const).map((g) => (
              <Button
                key={g}
                size="sm"
                variant={granularity === g ? "secondary" : "ghost"}
                onClick={() => setGranularity(g)}
              >
                {g === "day" ? "日" : g === "week" ? "周" : "月"}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-48 items-center justify-center text-sm text-slate-400">
              加载中…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trend} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="period" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
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
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#fbbf24" }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>分类分布</CardTitle>
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
              <p className="py-8 text-center text-sm text-slate-400">暂无分类数据</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>高频时段</CardTitle>
            <CardDescription>星期 × 小时 · 按用户时区</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-48 items-center justify-center text-sm text-slate-400">
                加载中…
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="grid min-w-[480px] grid-cols-[2rem_repeat(7,1fr)] gap-1 text-center">
                  <div />
                  {WEEKDAYS_CN.map((d) => (
                    <div key={d} className="text-[10px] text-slate-400">
                      {d}
                    </div>
                  ))}
                  {Array.from({ length: 24 }, (_, hour) => (
                    <HeatCellRow
                      key={hour}
                      hour={hour}
                      cells={heatmapRows[hour]}
                      max={heatmapMax(heatmap)}
                    />
                  ))}
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
    <Card>
      <CardContent className="flex flex-col gap-1 py-4">
        <span className="text-xs text-slate-400">{label}</span>
        <span className="text-2xl font-bold text-amber-300">{value}</span>
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

function HeatCellRow({
  hour,
  cells,
  max,
}: {
  hour: number;
  cells: HeatmapCell[];
  max: number;
}) {
  return (
    <>
      <div className="flex items-center justify-end text-[10px] text-slate-500">
        {String(hour).padStart(2, "0")}时
      </div>
      {WEEKDAYS_CN.map((_, dayIdx) => {
        const day = dayIdx + 1;
        const cell = cells.find((c) => c.day_of_week === day);
        const count = cell?.count ?? 0;
        const alpha = count === 0 ? 0.08 : 0.2 + 0.8 * (count / max);
        return (
          <div
            key={day}
            className="h-5 rounded"
            style={{ backgroundColor: count === 0 ? "rgba(148,163,184,0.08)" : `rgba(251,146,60,${alpha})` }}
            title={count === 0 ? `${WEEKDAYS_CN[dayIdx]} ${hour}时 无记录` : `${WEEKDAYS_CN[dayIdx]} ${hour}时 ${count}次`}
            data-testid="heatmap-cell"
          />
        );
      })}
    </>
  );
}
