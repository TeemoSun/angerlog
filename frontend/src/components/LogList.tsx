import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { errorMessage } from "@/lib/api";
import { deleteLogRequest, resolveLogRequest } from "@/lib/requests";
import { useLogsStore } from "@/stores/logs";
import type { LogItem } from "@/lib/types";
import { formatDateTime, intensityColor } from "@/lib/utils";
import { useState } from "react";

export function ResolveDialog({
  log,
  onClose,
  onResolved,
}: {
  log: LogItem | null;
  onClose: () => void;
  onResolved: (log: LogItem) => void;
}) {
  const [method, setMethod] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!log) return;
    if (!method.trim()) {
      setError("请写下你是怎么平复的");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const updated = await resolveLogRequest(log.id, method.trim());
      onResolved(updated);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!log} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>标记为已解决</DialogTitle>
          <DialogDescription>你是怎么让自己平静下来的？</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="resolution_method">解决办法</Label>
          <Input
            id="resolution_method"
            placeholder="例如：出去走了十分钟"
            maxLength={500}
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          />
          {error && (
            <p className="text-xs text-red-400" role="alert">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "保存中…" : "确认解决"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-4 w-4 shrink-0 rounded-full"
            style={{ backgroundColor: intensityColor(log.intensity) }}
            title={`程度 ${log.intensity}/10`}
          />
          <CardTitle className="text-sm font-semibold">
            {log.intensity}/10
          </CardTitle>
          {log.category && <Badge>{log.category}</Badge>}
          {log.is_resolved && (
            <Badge className="border-emerald-400/30 bg-emerald-500/15 text-emerald-300">
              ✓ 已解决
            </Badge>
          )}
        </div>
        <span className="text-xs text-slate-500">{formatDateTime(log.created_at)}</span>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className="text-sm leading-relaxed text-slate-200">{log.trigger_reason}</p>
        {log.is_resolved && log.resolution_method && (
          <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200/90">
            解决方法：{log.resolution_method}
          </p>
        )}
        {log.resolved_at && (
          <p className="text-xs text-slate-500">
            解决于 {formatDateTime(log.resolved_at)}
          </p>
        )}
        <div className="mt-1 flex items-center gap-2">
          {!log.is_resolved ? (
            <Button size="sm" variant="secondary" onClick={() => onResolve(log)}>
              标记解决
            </Button>
          ) : (
            <span className="text-xs text-emerald-400/80">已解决 ✓</span>
          )}
          {confirming ? (
            <div className="flex items-center gap-1">
              <Button size="sm" variant="danger" onClick={doDelete} disabled={deleting}>
                确认删除
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirming(false)}
              >
                取消
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" className="text-slate-400" onClick={() => setConfirming(true)}>
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
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.category ?? "all"}
          onValueChange={(v) => setFilter({ category: v === "all" ? null : v })}
        >
          <SelectTrigger className="w-28">
            <SelectValue placeholder="分类" />
          </SelectTrigger>
          <SelectContent>
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
          <SelectTrigger className="w-28">
            <SelectValue placeholder="解决状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="resolved">已解决</SelectItem>
            <SelectItem value="unresolved">未解决</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.intensityMin ? String(filters.intensityMin) : "all"}
          onValueChange={(v) => setFilter({ intensityMin: v === "all" ? null : Number(v) })}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="最低程度" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">任意程度</SelectItem>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <SelectItem key={n} value={String(n)}>
                ≥ {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="ghost" onClick={resetFilters}>
          重置筛选
        </Button>
      </div>

      {logs.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-slate-400">
            还没有记录，点击瓶口扔下第一颗小球吧
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {logs.map((log) => (
            <LogCard key={log.id} log={log} onResolve={onResolve} onDelete={onDelete} />
          ))}
        </div>
      )}

      {meta && meta.total > 0 && (
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            共 {meta.total} 条 · 第 {meta.page} 页
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={meta.page <= 1}
              onClick={() => onPageChange(meta.page - 1)}
            >
              上一页
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!meta.has_next}
              onClick={() => onPageChange(meta.page + 1)}
            >
              下一页
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
