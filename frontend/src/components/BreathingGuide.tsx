import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const PHASES = [
  { key: "in", label: "吸气", seconds: 4, scale: 1.3 },
  { key: "hold", label: "屏息", seconds: 7, scale: 1.3 },
  { key: "out", label: "呼气", seconds: 8, scale: 0.8 },
] as const;

export function useBreathingPhase(active: boolean) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [remaining, setRemaining] = useState<number>(PHASES[0].seconds);

  useEffect(() => {
    if (!active) {
      setPhaseIndex(0);
      setCycle(0);
      setRemaining(PHASES[0].seconds);
      return;
    }
    if (remaining <= 1) {
      const nextIndex = phaseIndex === PHASES.length - 1 ? 0 : phaseIndex + 1;
      const timer = setTimeout(() => {
        if (phaseIndex === PHASES.length - 1) setCycle((c) => c + 1);
        setPhaseIndex(nextIndex);
        setRemaining(PHASES[nextIndex].seconds);
      }, 1000);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(timer);
  }, [active, phaseIndex, remaining]);

  return { phase: PHASES[phaseIndex], cycle, remaining };
}

export function BreathingGuide({ active }: { active: boolean }) {
  const { phase, cycle, remaining } = useBreathingPhase(active);

  return (
    <div
      className="flex flex-col items-center gap-3 rounded-2xl border border-star-amber/20 bg-gradient-to-b from-star-gold/10 to-star-amber/10 p-4 text-amber-900/80"
      data-testid="breathing-guide"
    >      <div className="relative flex h-28 w-28 items-center justify-center">
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-star-amber/40"
          animate={{
            scale: active ? phase.scale : 0.8,
            opacity: active ? 1 : 0.5,
          }}
          transition={{
            duration: active ? phase.seconds : 0.3,
            ease: "easeInOut",
          }}
          data-testid="breathing-ring"
        />
        <motion.div
          className="h-14 w-14 rounded-full bg-gradient-to-br from-star-gold/40 to-star-amber/30 blur-[2px]"
          animate={{ scale: active ? Math.max(phase.scale - 0.25, 0.5) : 0.4 }}
          transition={{ duration: active ? phase.seconds : 0.3, ease: "easeInOut" }}
        />
        <div className="absolute flex flex-col items-center gap-1">
          <span className="text-2xl font-semibold text-amber-900">
            {active ? phase.label : "准备"}
          </span>
          {active && (
            <span
              className="text-4xl font-semibold text-amber-900"
              data-testid="phase-countdown"
            >
              {remaining}
            </span>
          )}
        </div>
      </div>
      {active && (
        <p className="text-xs text-amber-700/60" data-testid="breathing-cycle">
          已跟随 {cycle} 轮
        </p>
      )}
    </div>
  );
}
