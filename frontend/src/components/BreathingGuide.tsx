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

  useEffect(() => {
    if (!active) {
      setPhaseIndex(0);
      setCycle(0);
      return;
    }
    const timer = setTimeout(() => {
      if (phaseIndex === PHASES.length - 1) {
        setCycle((c) => c + 1);
        setPhaseIndex(0);
      } else {
        setPhaseIndex((i) => i + 1);
      }
    }, PHASES[phaseIndex].seconds * 1000);
    return () => clearTimeout(timer);
  }, [active, phaseIndex]);

  return { phase: PHASES[phaseIndex], cycle };
}

export function BreathingGuide({ active }: { active: boolean }) {
  const { phase, cycle } = useBreathingPhase(active);

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
        <span className="absolute text-2xl font-semibold text-amber-900">
          {active ? phase.label : "准备"}
        </span>
      </div>
      <p className="text-sm text-amber-800/80">
        4-7-8 呼吸：吸气 4 秒 · 屏息 7 秒 · 呼气 8 秒
      </p>
      {active && (
        <p className="text-xs text-amber-700/60" data-testid="breathing-cycle">
          已跟随 {cycle} 轮
        </p>
      )}
    </div>
  );
}
