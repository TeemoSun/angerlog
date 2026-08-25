import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { BreathingDialog } from "@/components/BreathingDialog";
import { DateTimePicker } from "@/components/DateTimePicker";
import { RoundedStar } from "@/components/Star";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage } from "@/lib/api";
import { createLogRequest } from "@/lib/requests";
import type { Category, LogItem } from "@/lib/types";
import { intensityColor, intensityLabel } from "@/lib/utils";

export const CATEGORIES: Category[] = ["工作", "家庭", "交通", "社交", "其他"];

const INTENSITY_LEVELS = [
  { value: 2, label: "生气" },
  { value: 5, label: "很生气" },
  { value: 7.5, valueSubmit: 8, label: "非常生气" },
  { value: 9.5, valueSubmit: 10, label: "特别生气" },
];

const schema = z.object({
  trigger_reason: z
    .string()
    .trim()
    .min(1, "请描述一下发生了什么")
    .max(500, "原因最多 500 字"),
  intensity: z.number().min(1).max(10),
  category: z.string().nullable(),
  created_at: z.date(),
});

type FormValues = z.infer<typeof schema>;

export function LogFormDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (log: LogItem) => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { trigger_reason: "", intensity: 5, category: null, created_at: new Date() },
  });

  const intensity = watch("intensity");
  const category = watch("category");
  const createdAt = watch("created_at");
  const [submitError, setSubmitError] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [breathingOpen, setBreathingOpen] = useState(false);

  const onSubmit = async (values: FormValues) => {
    setSubmitError("");
    try {
      const log = await createLogRequest({
        trigger_reason: values.trigger_reason,
        intensity: values.intensity,
        category: values.category,
        created_at: values.created_at.toISOString(),
      });
      reset({ trigger_reason: "", intensity: 5, category: null, created_at: new Date() });
      onOpenChange(false);
      onCreated(log);
    } catch (err) {
      setSubmitError(errorMessage(err));
    }
  };

  const selectIntensity = (value: number) => {
    setValue("intensity", value, { shouldValidate: true });
    if (value >= 8) setBreathingOpen(true);
  };

  const dateText = `${createdAt.getFullYear()} 年 ${createdAt.getMonth() + 1} 月 ${createdAt.getDate()} 日`;
  const timeText = `${String(createdAt.getHours()).padStart(2, "0")}:${String(
    createdAt.getMinutes(),
  ).padStart(2, "0")}`;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o)
          reset({ trigger_reason: "", intensity: 5, category: null, created_at: new Date() });
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[2.25rem] border-paper-muted/50 bg-paper text-ink">
        <DialogHeader className="text-center sm:text-left">
          <DialogTitle className="text-2xl font-normal text-ink">今天的心情</DialogTitle>
          <DialogDescription className="text-ink-light">
            写下来，折成一颗星星投进瓶中
          </DialogDescription>
        </DialogHeader>

        {/* 日期区 + 极细浅棕分割线 */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex items-baseline gap-2 text-left text-xs tracking-wide text-ink-light transition hover:text-ink"
            data-testid="log-form-date"
            aria-label="选择记录时间"
          >
            <span>{dateText}</span>
            <span className="text-ink-light/80">{timeText}</span>
            <span className="text-[10px] text-star-amber/70">▾ 选择</span>
          </button>
          <div className="h-px w-full bg-paper-muted" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" data-testid="log-form">
          <div className="flex flex-col gap-2">
            <Label htmlFor="trigger_reason" className="text-ink">发生了什么？</Label>
            <Textarea
              id="trigger_reason"
              placeholder="今天发生了什么……写下来，折成一颗星星。"
              maxLength={500}
              {...register("trigger_reason")}
              aria-invalid={!!errors.trigger_reason}
              className="font-input min-h-[100px] rounded-2xl border-none bg-transparent px-1 text-ink shadow-none placeholder:text-ink-light/60 focus-visible:ring-0"
            />
            {errors.trigger_reason && (
              <p className="text-xs text-star-crimson" role="alert">
                {errors.trigger_reason.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <Label className="text-ink">生气程度</Label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {INTENSITY_LEVELS.map((level) => {
                const submitValue = level.valueSubmit ?? level.value;
                const selected = intensity === submitValue;
                return (
                  <button
                    key={level.label}
                    type="button"
                    onClick={() => selectIntensity(submitValue)}
                    className={
                      "flex items-center gap-2 rounded-2xl border-2 p-3 transition sm:flex-col sm:justify-center " +
                      (selected
                        ? "border-star-amber/60 bg-star-amber/10 shadow-[0_0_18px_rgba(251,191,36,0.15)]"
                        : "border-paper-muted/60 bg-white/70 hover:border-star-amber/40")
                    }
                    data-testid={`mood-${level.label}`}
                  >
                    <RoundedStar size={28} color={intensityColor(submitValue)} glow />
                    <span className="text-sm font-medium text-ink">{level.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-ink-light">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: intensityColor(intensity) }}
              />
              <span data-testid="intensity-value">{intensity}</span>
              /10
              <span className="text-xs">{intensityLabel(intensity)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="category" className="text-ink">分类（可选）</Label>
            <Select
              value={category ?? "none"}
              onValueChange={(v) => setValue("category", v === "none" ? null : v)}
            >
              <SelectTrigger id="category" className="rounded-xl border-paper-muted/70 bg-white/60 text-ink focus:ring-star-amber/70">
                <SelectValue placeholder="选择分类" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-paper-muted bg-paper">
                <SelectItem value="none">不分类</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="text-ink focus:bg-star-amber/10">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {submitError && (
            <p className="text-xs text-star-crimson" role="alert">
              {submitError}
            </p>
          )}

          <DialogFooter>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-camel px-8 text-white shadow-lg shadow-amber-900/20 transition hover:scale-[1.02] hover:bg-camel-hover hover:shadow-xl hover:shadow-amber-900/30 disabled:opacity-60 sm:w-auto"
            >
              {isSubmitting ? "投入中…" : "折成星星 ✨"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      <DateTimePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        value={createdAt}
        onChange={(d) => setValue("created_at", d, { shouldValidate: true })}
        title="选择生气时间"
      />
      <BreathingDialog open={breathingOpen} onOpenChange={setBreathingOpen} />
    </Dialog>
  );
}
