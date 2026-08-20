import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { BreathingGuide } from "@/components/BreathingGuide";
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
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage } from "@/lib/api";
import { createLogRequest } from "@/lib/requests";
import type { Category, LogItem } from "@/lib/types";
import { intensityColor, intensityDescription } from "@/lib/utils";

export const CATEGORIES: Category[] = ["工作", "家庭", "交通", "社交", "其他"];

const schema = z.object({
  trigger_reason: z
    .string()
    .trim()
    .min(1, "请描述一下发生了什么")
    .max(500, "原因最多 500 字"),
  intensity: z.number().min(1).max(10),
  category: z.string().nullable(),
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
    defaultValues: { trigger_reason: "", intensity: 5, category: null },
  });

  const intensity = watch("intensity");
  const category = watch("category");
  const high = intensity >= 8;
  const [submitError, setSubmitError] = useState("");

  const onSubmit = async (values: FormValues) => {
    setSubmitError("");
    try {
      const log = await createLogRequest(values);
      reset();
      onOpenChange(false);
      onCreated(log);
    } catch (err) {
      setSubmitError(errorMessage(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!o) reset();
      onOpenChange(o);
    }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>扔一颗小球</DialogTitle>
          <DialogDescription>记录此刻的生气，让情绪有处安放</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" data-testid="log-form">
          <div className="flex flex-col gap-2">
            <Label htmlFor="trigger_reason">发生了什么？</Label>
            <Textarea
              id="trigger_reason"
              placeholder="例如：会议被临时取消，白等了一小时…"
              maxLength={500}
              {...register("trigger_reason")}
              aria-invalid={!!errors.trigger_reason}
            />
            {errors.trigger_reason && (
              <p className="text-xs text-red-400" role="alert">
                {errors.trigger_reason.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="intensity">生气程度</Label>
              <span className="flex items-center gap-2 text-sm font-semibold">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: intensityColor(intensity) }}
                />
                <span data-testid="intensity-value">{intensity}</span>/10
                <span className="text-xs font-normal text-slate-400">
                  {intensityDescription(intensity)}
                </span>
              </span>
            </div>
            <Slider
              id="intensity"
              min={1}
              max={10}
              step={1}
              value={[intensity]}
              onValueChange={([v]) => setValue("intensity", v)}
              aria-label="生气程度"
            />
            {high && (
              <p className="text-xs text-orange-300" role="alert" data-testid="high-intensity-hint">
                程度较高，试试下面的呼吸引导
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="category">分类（可选）</Label>
            <Select
              value={category ?? "none"}
              onValueChange={(v) => setValue("category", v === "none" ? null : v)}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="选择分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">不分类</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {high && <BreathingGuide active={open} />}

          {submitError && (
            <p className="text-xs text-red-400" role="alert">
              {submitError}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? "投入中…" : "投入瓶中"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
