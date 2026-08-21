import { useEffect, useState } from "react";

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

  useEffect(() => {
    setMethod("");
    setError("");
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
      const updated = await resolveLogRequest(log.id, method.trim());
      setMethod("");
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
      <DialogContent className="border-paper-muted/50 bg-paper text-ink">
        <DialogHeader className="text-center sm:text-left">
          <DialogTitle className="font-hand text-2xl font-normal text-ink">
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
            className="rounded-xl border-paper-muted/70 bg-white/60 text-ink placeholder:text-ink-light/60 focus-visible:ring-star-amber/70"
          />
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
      </DialogContent>
    </Dialog>
  );
}
