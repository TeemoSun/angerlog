import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RoundedStar } from "@/components/Star";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deleteLogRequest } from "@/lib/requests";
import { useLogsStore } from "@/stores/logs";
import type { LogItem } from "@/lib/types";
import { formatDateTime, intensityColor, intensityLabel } from "@/lib/utils";
import { useState } from "react";

function LogCard({
  log,
  onResolve,
  onDelete,
}: {
  log: LogItem;
  onResolve: (log: LogItem) => void;
  onDelete: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const doDelete = async () => {
    setDeleting(true);
    try {
      await deleteLogRequest(log.id);
      onDelete(log.id);
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  };

  const color = intensityColor(log.intensity);
  const label = intensityLabel(log.intensity);

  return (
    <Card className="relative overflow-hidden border-none bg-paper text-ink shadow-xl shadow-black/15">
      {/* 左侧情绪色条（圆角收尾） */}
      <div
        className="absolute left-0 top-2.5 bottom-2.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />

      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pl-5 pt-5">
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-white shadow-sm"
            style={{ backgroundColor: color }}
          >
            <RoundedStar size={14} color="#ffffff" />
            {label}
          </div>
          {log.category && (
            <Badge className="rounded-full border-paper-muted bg-paper-muted text-ink-light">
              {log.category}
            </Badge>
          )}
          {log.is_resolved && (
            <Badge className="rounded-full border-star-amber/30 bg-star-gold/15 text-amber-800">
              ✓ 已解决
            </Badge>
          )}
        </div>
        <span className="text-xs text-ink-light/80">{formatDateTime(log.created_at)}</span>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 pl-5 pr-5 pb-5">
        <p className="font-input text-sm leading-relaxed text-ink">{log.trigger_reason}</p>

        {log.is_resolved && log.resolution_method && (
          <div className="rounded-xl border border-star-amber/20 bg-star-gold/10 px-3 py-2.5">
            <p className="mb-1 text-xs font-medium text-amber-700">情绪是怎么消解的</p>
            <p className="font-input text-sm text-amber-800/90">{log.resolution_method}</p>
          </div>
        )}

        {log.resolved_at && (
          <p className="text-xs text-ink-light/70">
            解决于 {formatDateTime(log.resolved_at)}
          </p>
        )}

        <div className="mt-1 flex items-center gap-2">
          {!log.is_resolved && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onResolve(log)}
              className="rounded-full bg-paper-muted text-ink hover:bg-paper-muted/80"
            >
              写下消气原因
            </Button>
          )}
          {log.is_resolved && (
            <span className="text-xs text-amber-600">已解决 ✓</span>
          )}
          {confirming ? (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="danger"
                onClick={doDelete}
                disabled={deleting}
                className="rounded-full"
              >
                确认删除
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirming(false)}
                className="text-ink-light hover:bg-paper-muted hover:text-ink"
              >
                取消
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="text-ink-light/70 hover:bg-paper-muted hover:text-ink"
              onClick={() => setConfirming(true)}
            >
              删除
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function LogList({
  logs,
  onResolve,
  onDelete,
  meta,
  onPageChange,
}: {
  logs: LogItem[];
  onResolve: (log: LogItem) => void;
  onDelete: (id: string) => void;
  meta: { page: number; has_next: boolean; total: number } | null;
  onPageChange: (page: number) => void;
}) {
  const { filters, setFilter, resetFilters } = useLogsStore();

  return (
    <div className="flex flex-col gap-4">
      {/* 顶部标题 */}
      <div className="mb-1 flex items-center gap-2">
        <h2 className="text-2xl text-paper">瓶中信件</h2>
        <span className="text-sm text-milk-dim">写下消气原因，封存情绪</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.category ?? "all"}
          onValueChange={(v) => setFilter({ category: v === "all" ? null : v })}
        >
          <SelectTrigger className="w-28 rounded-full border-glass-border bg-glass text-milk backdrop-blur-xl">
            <SelectValue placeholder="分类" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-white/10 bg-night-800/95 text-milk backdrop-blur-2xl">
            <SelectItem value="all">全部分类</SelectItem>
            {["工作", "家庭", "交通", "社交", "其他"].map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.resolved}
          onValueChange={(v) => setFilter({ resolved: v as "all" | "resolved" | "unresolved" })}
        >
          <SelectTrigger className="w-28 rounded-full border-glass-border bg-glass text-milk backdrop-blur-xl">
            <SelectValue placeholder="解决状态" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-white/10 bg-night-800/95 text-milk backdrop-blur-2xl">
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="resolved">已解决</SelectItem>
            <SelectItem value="unresolved">未解决</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.intensityMin ? String(filters.intensityMin) : "all"}
          onValueChange={(v) => setFilter({ intensityMin: v === "all" ? null : Number(v) })}
        >
          <SelectTrigger className="w-32 rounded-full border-glass-border bg-glass text-milk backdrop-blur-xl">
            <SelectValue placeholder="最低程度" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-white/10 bg-night-800/95 text-milk backdrop-blur-2xl">
            <SelectItem value="all">任意程度</SelectItem>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <SelectItem key={n} value={String(n)}>
                ≥ {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          size="sm"
          variant="ghost"
          onClick={resetFilters}
          className="rounded-full text-milk-dim hover:bg-white/5 hover:text-milk"
        >
          重置筛选
        </Button>
      </div>

      {logs.length === 0 ? (
        <Card className="border-glass-border bg-glass text-center backdrop-blur-xl">
          <CardContent className="py-12 text-sm text-milk-dim">
            瓶子里还空着，先写一封信吧
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {logs.map((log) => (
            <LogCard key={log.id} log={log} onResolve={onResolve} onDelete={onDelete} />
          ))}
        </div>
      )}

      {meta && meta.total > 0 && (
        <div className="flex items-center justify-between text-xs text-milk-dim">
          <span>
            共 {meta.total} 条 · 第 {meta.page} 页
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={meta.page <= 1}
              onClick={() => onPageChange(meta.page - 1)}
              className="rounded-full border-glass-border bg-glass text-milk hover:bg-glass-strong disabled:opacity-40"
            >
              上一页
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!meta.has_next}
              onClick={() => onPageChange(meta.page + 1)}
              className="rounded-full border-glass-border bg-glass text-milk hover:bg-glass-strong disabled:opacity-40"
            >
              下一页
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
