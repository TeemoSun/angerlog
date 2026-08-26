import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { appTimezone, cn, wallParts, wallTimeToUTC } from "@/lib/utils";

const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
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
  const tz = appTimezone();
  const wall = wallParts(value, tz);
  const [viewYear, setViewYear] = useState(wall.year);
  const [viewMonth, setViewMonth] = useState(wall.month - 1);

  useEffect(() => {
    if (open) {
      setViewYear(wall.year);
      setViewMonth(wall.month - 1);
    }
    // 仅在打开时重置，避免外部 value 变化时抖动
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const hour = wall.hour;
  const minute = wall.minute;

  const todayWall = wallParts(new Date(), tz);
  const todayKey = `${todayWall.year}-${todayWall.month - 1}-${todayWall.day}`;
  const selectedKey = `${wall.year}-${wall.month - 1}-${wall.day}`;

  const days = useMemo(() => {
    const first = new Date(Date.UTC(viewYear, viewMonth, 1));
    let startWeekday = first.getUTCDay() - 1; // 周一=0
    if (startWeekday < 0) startWeekday = 6;
    const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();
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
    const picked = new Date(wallTimeToUTC({ ...wall, day }, tz));
    if (picked.getTime() > Date.now()) {
      // 所选时刻尚未到来，钳制为当前时间
      onChange(new Date());
    } else {
      onChange(picked);
    }
  };

  // 改时分时组合新时间并同步到外部 value
  const setHour = (h: number) => {
    onChange(new Date(wallTimeToUTC({ ...wall, hour: h }, tz)));
  };
  const setMinute = (m: number) => {
    onChange(new Date(wallTimeToUTC({ ...wall, minute: m }, tz)));
  };

  const setNow = () => {
    const now = new Date();
    onChange(now);
  };

  const confirm = () => {
    // 最终值若超过当前时间，钳制为现在，避免后端拒绝未来时间
    if (value.getTime() > Date.now()) {
      onChange(new Date());
    }
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
            const cellDate = wallTimeToUTC({ ...wall, day }, tz);
            const isFuture = cellDate > Date.now();
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
        <div className="flex items-center justify-center gap-3 rounded-2xl bg-paper-muted/60 py-3">
          <WheelPicker
            range={24}
            value={hour}
            onChange={setHour}
            ariaLabel="时"
          />
          <span className="text-2xl font-light text-ink-light">:</span>
          <WheelPicker
            range={60}
            value={minute}
            onChange={setMinute}
            ariaLabel="分"
          />
          <span className="ml-1 text-xs text-ink-light">{hour >= 12 ? "下午" : "上午"}</span>
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
}: {
  range: number;
  value: number;
  onChange: (v: number) => void;
  ariaLabel: string;
}) {
  const ITEM_H = 40; // 每项高度 px
  const VISIBLE = 5; // 可见行数
  const containerH = ITEM_H * VISIBLE;
  const listRef = useRef<HTMLDivElement>(null);
  const scrollTimer = useRef<number | null>(null);
  const [active, setActive] = useState(value);

  // 中间份的起始索引（渲染 3 份实现循环）
  const midStart = range;

  // 外部 value 变化（如点此刻）时同步滚动到中间份
  useEffect(() => {
    setActive(value);
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: (midStart + value) * ITEM_H, behavior: "smooth" });
  }, [value, midStart]);

  // 滚动时更新高亮；越界则瞬间跳回中间份，实现无缝循环
  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    let idx = Math.round(el.scrollTop / ITEM_H);
    if (idx < range) {
      // 滚到第一份：跳回中间份
      idx += range;
      el.scrollTo({ top: idx * ITEM_H });
    } else if (idx >= range * 2) {
      // 滚到第三份：跳回中间份
      idx -= range;
      el.scrollTo({ top: idx * ITEM_H });
    }
    const real = idx % range;
    setActive(real);
    if (scrollTimer.current) window.clearTimeout(scrollTimer.current);
    scrollTimer.current = window.setTimeout(() => {
      onChange(real);
    }, 150);
  };

  const commit = (idx: number) => {
    if (scrollTimer.current) window.clearTimeout(scrollTimer.current);
    setActive(idx);
    onChange(idx);
    const el = listRef.current;
    if (el) el.scrollTo({ top: (midStart + idx) * ITEM_H, behavior: "smooth" });
  };

  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-white/70"
      style={{ height: containerH, width: 64 }}
      role="listbox"
      aria-label={ariaLabel}
    >
      {/* 选中区高亮条 */}
      <div
        className="pointer-events-none absolute left-1 right-1 rounded-xl bg-camel/20"
        style={{ top: ITEM_H, height: ITEM_H }}
      />
      {/* 上下渐隐遮罩 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/90 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white/90 to-transparent" />
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto snap-y snap-mandatory"
        style={{ scrollbarWidth: "none" }}
      >
        {/* 顶部/底部留白让首尾项可居中 */}
        <div style={{ height: ITEM_H }} />
        {Array.from({ length: range * 3 }, (_, i) => {
          const real = i % range;
          const selected = real === active;
          return (
            <button
              type="button"
              key={i}
              onClick={() => commit(real)}
              style={{ height: ITEM_H }}
              className={cn(
                "flex w-full snap-center items-center justify-center transition-all duration-200",
                selected
                  ? "scale-110 text-lg font-semibold text-camel"
                  : "scale-90 text-sm text-ink/50",
              )}
            >
              {pad(real)}
            </button>
          );
        })}
        <div style={{ height: ITEM_H }} />
      </div>
    </div>
  );
}