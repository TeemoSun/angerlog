import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Bottle } from "@/components/Bottle";
import { LogFormDialog } from "@/components/LogFormDialog";
import { LogList } from "@/components/LogList";
import { ResolveDialog } from "@/components/ResolveDialog";
import { StatsPanel } from "@/components/StatsPanel";
import { TabBar, type TabKey } from "@/components/TabBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { errorMessage } from "@/lib/api";
import { fetchLogs, fetchSummary } from "@/lib/requests";
import type { LogItem, PageMeta, Summary } from "@/lib/types";
import { startOfThisWeekStr, todayStr } from "@/lib/utils";
import { useLogsStore } from "@/stores/logs";

const PAGE_SIZE = 20;

export function HomePage() {
  const [tab, setTab] = useState<TabKey>("bottle");
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [resolveTarget, setResolveTarget] = useState<LogItem | null>(null);
  const [error, setError] = useState("");
  const { filters } = useLogsStore();
  const navigate = useNavigate();

  const loadLogs = useCallback(async () => {
    setError("");
    try {
      const params = {
        page,
        page_size: PAGE_SIZE,
        ...(filters.intensityMin != null && { intensity_min: filters.intensityMin }),
        ...(filters.intensityMax != null && { intensity_max: filters.intensityMax }),
        ...(filters.category != null && { category: filters.category }),
        ...(filters.resolved !== "all" && { resolved: filters.resolved === "resolved" }),
      };
      const { items, meta: m } = await fetchLogs(params);
      setLogs(items);
      setMeta(m);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [page, filters]);

  const loadSummary = useCallback(async () => {
    try {
      const s = await fetchSummary(startOfThisWeekStr(), todayStr());
      setSummary(s);
    } catch {
      // 首页概览非关键，失败不阻塞
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const handleCreated = useCallback(
    (created: LogItem) => {
      setLogs((prev) => [created, ...prev]);
      setTab("bottle");
      loadSummary();
      loadLogs();
    },
    [loadSummary, loadLogs],
  );

  const handleResolved = useCallback(
    (updated: LogItem) => {
      setLogs((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      loadSummary();
    },
    [loadSummary],
  );

  const handleDeleted = useCallback(
    (id: string) => {
      setLogs((prev) => prev.filter((l) => l.id !== id));
      loadSummary();
      loadLogs();
    },
    [loadSummary, loadLogs],
  );

  const handleLogout = async () => {
    try {
      const { logoutRequest } = await import("@/lib/requests");
      await logoutRequest();
    } catch {
      // 忽略登出失败，直接清本地
    }
    navigate("/login", { replace: true });
  };

  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-night-900/40 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl drop-shadow-md">🫙</span>
            <h1 className="text-2xl font-normal tracking-wide text-paper">情绪瓶</h1>
          </div>
          <TabBar active={tab} onChange={setTab} />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-milk-dim hover:bg-white/5 hover:text-milk"
          >
            退出
          </Button>
        </div>
      </header>

      <main className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-20 pt-6 sm:pb-8">
        {error && (
          <Card className="relative z-10 mb-4 border-star-red/30 bg-star-red/10">
            <CardContent className="py-3 text-sm text-star-red/90">{error}</CardContent>
          </Card>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            className="relative z-10 flex flex-1 flex-col"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {tab === "bottle" && (
              <div className="flex flex-1 flex-col items-center justify-center gap-6">
                <Bottle logs={logs} onOpenForm={() => setFormOpen(true)} />
                <div className="grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
                  <SummaryTile
                    label="今日已记录"
                    value={summary?.total_count != null ? String(summary.total_count) : "—"}
                  />
                  <SummaryTile
                    label="本周平均强度"
                    value={summary?.avg_intensity != null ? summary.avg_intensity.toFixed(1) : "—"}
                  />
                  <SummaryTile
                    label="解决率"
                    value={
                      summary?.resolve_rate != null
                        ? `${Math.round(summary.resolve_rate * 100)}%`
                        : "—"
                    }
                  />
                </div>
              </div>
            )}

            {tab === "logs" && (
              <LogList
                logs={logs}
                meta={meta}
                onResolve={(log) => setResolveTarget(log)}
                onDelete={handleDeleted}
                onPageChange={setPage}
              />
            )}

            {tab === "stats" && <StatsPanel />}
          </motion.div>
        </AnimatePresence>
      </main>

      <LogFormDialog open={formOpen} onOpenChange={setFormOpen} onCreated={handleCreated} />
      <ResolveDialog
        log={resolveTarget}
        onClose={() => setResolveTarget(null)}
        onResolved={(updated: LogItem) => {
          handleResolved(updated);
          setResolveTarget(null);
        }}
      />
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-glass-border bg-glass text-center backdrop-blur-xl">
      <CardContent className="flex flex-col items-center gap-1 py-4 text-center sm:py-5">
        <span className="text-xs text-milk-dim">{label}</span>
        <span className="text-2xl font-bold text-star-amber drop-shadow-sm sm:text-3xl">{value}</span>
      </CardContent>
    </Card>
  );
}
