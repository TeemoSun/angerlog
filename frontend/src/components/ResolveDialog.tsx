import { useEffect, useState } from "react";

import { DateTimePicker } from "@/components/DateTimePicker";
import { Button } from "@/components/ui/button";
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
import { errorMessage } from "@/lib/api";
import { resolveLogRequest } from "@/lib/requests";
import type { LogItem } from "@/lib/types";

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
  const [resolvedAt, setResolvedAt] = useState<Date>(new Date());
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    setMethod("");
    setError("");
    setResolvedAt(new Date());
  }, [log?.id]);

  const submit = async () => {
    if (!log) return;
    if (!method.trim()) {
      setError("请写下你是怎么平复的");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const updated = await resolveLogRequest(log.id, method.trim(), resolvedAt.toISOString());
      setMethod("");
      onResolved(updated);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const timeText = `${String(resolvedAt.getHours()).padStart(2, "0")}:${String(
    resolvedAt.getMinutes(),
  ).padStart(2, "0")}`;
  const dateText = `${resolvedAt.getFullYear()} 年 ${resolvedAt.getMonth() + 1} 月 ${resolvedAt.getDate()} 日`;

  return (
    <Dialog open={!!log} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="border-paper-muted/50 bg-paper text-ink">
        <DialogHeader className="text-center sm:text-left">
          <DialogTitle className="text-2xl font-normal text-ink">
            写下消气原因
          </DialogTitle>
          <DialogDescription className="text-ink-light">
            情绪是怎么消解的？
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="resolution_method" className="text-ink">
            解决办法
          </Label>
          <Input
            id="resolution_method"
            placeholder="写下这个情绪后来是怎么消失的…"
            maxLength={500}
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="font-input rounded-xl border-paper-muted/70 bg-white/60 text-ink placeholder:text-ink-light/60 focus-visible:ring-star-amber/70"
          />
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex items-baseline gap-2 text-left text-xs tracking-wide text-ink-light transition hover:text-ink"
            data-testid="resolve-form-date"
            aria-label="选择解决时间"
          >
            <span>{dateText}</span>
            <span className="text-ink-light/80">{timeText}</span>
            <span className="text-[10px] text-star-amber/70">▾ 选择</span>
          </button>
          {error && (
            <p className="text-xs text-star-crimson" role="alert">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-ink-light hover:bg-paper-muted hover:text-ink"
          >
            取消
          </Button>
          <Button
            onClick={submit}
            disabled={submitting}
            className="rounded-full bg-gradient-to-r from-star-gold via-star-amber to-star-orange text-white shadow-lg shadow-amber-900/20"
          >
            {submitting ? "保存中…" : "保存"}
          </Button>
        </DialogFooter>
        <DateTimePicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          value={resolvedAt}
          onChange={setResolvedAt}
          title="选择解决时间"
        />
      </DialogContent>
    </Dialog>
  );
}
