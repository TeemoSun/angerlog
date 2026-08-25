import { useEffect, useState } from "react";

import { BreathingGuide, breathingFrameClass } from "@/components/BreathingGuide";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const COUNTDOWN_FROM = 3;

export function BreathingDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [accept, setAccept] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_FROM);

  useEffect(() => {
    if (!open) {
      setAccept(false);
      setCountdown(COUNTDOWN_FROM);
    }
  }, [open]);

  useEffect(() => {
    if (!accept) return;
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [accept, countdown]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-paper-muted/50 bg-paper text-ink">
        {!accept ? (
          <>
            <DialogHeader className="text-center sm:text-left">
              <DialogTitle className="text-2xl font-normal text-ink">跟着呼吸训练一下？</DialogTitle>
              <DialogDescription className="text-ink-light">
                一起做呼吸练习，平复一下心情
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="text-ink-light hover:bg-paper-muted hover:text-ink"
              >
                不用了
              </Button>
              <Button
                onClick={() => setAccept(true)}
                className="rounded-full bg-gradient-to-r from-star-gold via-star-amber to-star-orange text-white shadow-lg shadow-amber-900/20"
              >
                好的
              </Button>
            </DialogFooter>
          </>
        ) : countdown > 0 ? (
          <>
            <DialogHeader className="text-center">
              <DialogTitle className="text-2xl font-normal text-ink">准备</DialogTitle>
              <DialogDescription className="text-ink-light">
                跟着呼吸的节奏，一起放松下来
              </DialogDescription>
            </DialogHeader>
            <div className={breathingFrameClass}>
              <p
                className="text-6xl font-semibold text-star-amber"
                data-testid="breathing-countdown"
              >
                {countdown}
              </p>
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="text-center">
              <DialogTitle className="text-2xl font-normal text-ink">跟着呼吸</DialogTitle>
              <DialogDescription className="text-ink-light">
                慢慢吸气、屏息、呼气
              </DialogDescription>
            </DialogHeader>
            <BreathingGuide active />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
