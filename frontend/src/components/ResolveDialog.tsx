import { useState } from "react";

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
