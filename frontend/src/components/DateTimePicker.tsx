import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** 带时区的本地时间戳（毫秒），始终视为用户本地时区。 */
function toLocalMs(d: Date): number {
  return d.getTime();
}

export function DateTimePicker({
  open,
  onOpenChange,
  value,
  onChange,
  title = "选择时间",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: Date;
  onChange: (value: Date) => void;
  title?: string;
}) {
  const [viewYear, setViewYear] = useState(value.getFullYear());
  const [viewMonth, setViewMonth] = useState(value.getMonth());
  const [hour, setHour] = useState(value.getHours());
  const [minute, setMinute] = useState(value.getMinutes());

  useEffect(() => {
    if (open) {
      setViewYear(value.getFullYear());
      setViewMonth(value.getMonth());
      setHour(value.getHours());
      setMinute(value.getMinutes());
    }
    // 仅在打开时重置，避免外部 value 变化时抖动
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  const selectedKey = `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`;

  const days = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    let startWeekday = first.getDay() - 1; // 周一=0
    if (startWeekday < 0) startWeekday = 6;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [viewYear, viewMonth]);

  const monthLabel = `${viewYear} 年 ${viewMonth + 1} 月`;

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const pickDay = (day: number) => {
    const picked = new Date(viewYear, viewMonth, day, hour, minute, 0, 0);
    if (toLocalMs(picked) <= Date.now()) {
      onChange(picked);
    }
  };

  const setNow = () => {
    const now = new Date();
    onChange(now);
  };

  const confirm = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs gap-3 rounded-[2rem] border-paper-muted/50 bg-paper p-5 text-ink">
        <DialogHeader className="text-center">
          <DialogTitle className="text-xl font-normal text-ink">{title}</DialogTitle>
        </DialogHeader>

        {/* 月份导航 */}
        <div className="flex items-center justify-between px-1">
          <button
            type="button"
            onClick={prevMonth}
            aria-label="上个月"
            className="rounded-full p-1.5 text-ink-light transition hover:bg-paper-muted hover:text-ink"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium text-ink">{monthLabel}</span>
          <button
            type="button"
            onClick={nextMonth}
            aria-label="下个月"
            className="rounded-full p-1.5 text-ink-light transition hover:bg-paper-muted hover:text-ink"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* 星期表头 */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAY_LABELS.map((w) => (
            <span key={w} className="py-1 text-xs text-ink-light">
              {w}
            </span>
          ))}
        </div>

        {/* 日期网格 */}
        <div className="grid grid-cols-7 gap-1" data-testid="dtp-grid">
          {days.map((day, idx) => {
            if (day === null) return <span key={`e-${idx}`} />;
            const key = `${viewYear}-${viewMonth}-${day}`;
            const isToday = key === todayKey;
            const isSelected = key === selectedKey;
            const cellDate = new Date(viewYear, viewMonth, day, 23, 59, 59);
            const isFuture = toLocalMs(cellDate) > Date.now();
            return (
              <button
                key={key}
                type="button"
                onClick={() => pickDay(day)}
                disabled={isFuture}
                className={cn(
                  "h-9 w-9 rounded-full text-sm transition",
                  isSelected
                    ? "bg-camel text-white shadow-sm"
                    : isFuture
                      ? "text-ink-light/30"
                      : "text-ink hover:bg-paper-muted",
                  isToday && !isSelected && "ring-1 ring-star-amber/40",
                )}
              >
                {day}
              </button>
            );
          })}
        </div>

        {/* 时间选择 */}
        <div className="flex items-center justify-center gap-2 rounded-2xl bg-paper-muted/60 py-2.5">
          <WheelPicker
            range={24}
            value={hour}
            onChange={setHour}
            ariaLabel="时"
            pad2
          />
          <span className="text-lg text-ink-light">:</span>
          <WheelPicker
            range={60}
            value={minute}
            onChange={setMinute}
            ariaLabel="分"
            pad2
          />
          <span className="ml-1 text-xs text-ink-light">{value.getHours() >= 12 ? "下午" : "上午"}</span>
        </div>

        <DialogFooter className="flex-row justify-center gap-2 sm:justify-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={setNow}
            className="rounded-full text-ink-light hover:bg-paper-muted hover:text-ink"
          >
            此刻
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={confirm}
            className="rounded-full bg-camel px-6 text-white shadow-md shadow-amber-900/15 hover:bg-camel-hover"
            data-testid="dtp-confirm"
          >
            确定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WheelPicker({
  range,
  value,
  onChange,
  ariaLabel,
  pad2,
}: {
  range: number;
  value: number;
  onChange: (v: number) => void;
  ariaLabel: string;
  pad2: boolean;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="appearance-none rounded-lg bg-white/70 px-2 py-1 text-center text-base font-medium text-ink focus:outline-none focus:ring-2 focus:ring-star-amber/50"
    >
      {Array.from({ length: range }, (_, i) => (
        <option key={i} value={i}>
          {pad2 ? pad(i) : i}
        </option>
      ))}
    </select>
  );
}