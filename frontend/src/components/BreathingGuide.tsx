import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

const PHASES = [
  { key: "in", label: "吸气", seconds: 4, scale: 1.3, color: "#f6d365" },
  { key: "hold", label: "屏息", seconds: 7, scale: 1.3, color: "#fbbf24" },
  { key: "out", label: "呼气", seconds: 8, scale: 0.8, color: "#fb923c" },
] as const;

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export const breathingFrameClass =
  "flex h-[172px] flex-col items-center justify-center gap-3 rounded-2xl border border-star-amber/20 bg-gradient-to-b from-star-gold/10 to-star-amber/10 p-4 text-amber-900/80";

export function useBreathingPhase(active: boolean) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);

  useEffect(() => {
    if (!active) {
      setPhaseIndex(0);
      setCycle(0);
      setCompleted([]);
      return;
    }
    const timer = setTimeout(() => {
      const nextIndex = phaseIndex === PHASES.length - 1 ? 0 : phaseIndex + 1;
      if (phaseIndex === PHASES.length - 1) {
        setCycle((c) => c + 1);
        setCompleted([]);
      } else {
        setCompleted((done) => [...done, PHASES[phaseIndex].key]);
      }
      setPhaseIndex(nextIndex);
    }, PHASES[phaseIndex].seconds * 1000);
    return () => clearTimeout(timer);
  }, [active, phaseIndex]);

  return { phase: PHASES[phaseIndex], cycle, completed };
}

export function BreathingGuide({ active }: { active: boolean }) {
  const { phase, cycle, completed } = useBreathingPhase(active);

  return (
    <div
      className={breathingFrameClass}
      data-testid="breathing-guide"
    >      <div className="relative flex h-28 w-28 items-center justify-center">
        <motion.div
          className="absolute inset-0"
          animate={{
            scale: active ? phase.scale : 0.8,
            opacity: active ? 1 : 0.5,
          }}
          transition={{
            duration: active ? phase.seconds : 0.3,
            ease: "easeInOut",
          }}
          data-testid="breathing-ring"
        >
          <svg className="h-full w-full -rotate-90" viewBox="0 0 112 112">
            <circle
              cx="56"
              cy="56"
              r={RADIUS}
              fill="none"
              strokeWidth="2.5"
              stroke="currentColor"
              className="text-star-amber/25"
            />
            {active && (
              <AnimatePresence>
                {completed.map((key) => {
                  const done = PHASES.find((p) => p.key === key)!;
                  return (
                    <motion.circle
                      key={`${key}-${cycle}`}
                      cx="56"
                      cy="56"
                      r={RADIUS}
                      fill="none"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      stroke={done.color}
                      strokeDasharray={CIRCUMFERENCE}
                      strokeDashoffset={0}
                      style={{ opacity: 0.45 }}
                      exit={{ opacity: 0, transition: { duration: 1.2 } }}
                    />
                  );
                })}
              </AnimatePresence>
            )}
            {active && (
              <motion.circle
                key={`${phase.key}-${cycle}`}
                cx="56"
                cy="56"
                r={RADIUS}
                fill="none"
                strokeWidth="2.5"
                strokeLinecap="round"
                stroke={phase.color}
                strokeDasharray={CIRCUMFERENCE}
                initial={{ strokeDashoffset: CIRCUMFERENCE }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: phase.seconds, ease: "linear" }}
                data-testid="breathing-progress"
              />
            )}
          </svg>
        </motion.div>
        <motion.div
          className="h-14 w-14 rounded-full bg-gradient-to-br from-star-gold/40 to-star-amber/30 blur-[2px]"
          animate={{ scale: active ? Math.max(phase.scale - 0.25, 0.5) : 0.4 }}
          transition={{ duration: active ? phase.seconds : 0.3, ease: "easeInOut" }}
        />
        <span className="absolute text-2xl font-semibold text-amber-900">
          {active ? phase.label : "准备"}
        </span>
      </div>
      {active && (
        <p className="text-xs text-amber-700/60" data-testid="breathing-cycle">
          已跟随 {cycle} 轮
        </p>
      )}
    </div>
  );
}
