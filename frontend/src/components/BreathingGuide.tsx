import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const PHASES = [
  { key: "in", label: "吸气", seconds: 4, scale: 1.3, color: "text-star-gold/80", doneColor: "text-star-gold/60" },
  { key: "hold", label: "屏息", seconds: 7, scale: 1.3, color: "text-star-amber/80", doneColor: "text-star-amber/60" },
  { key: "out", label: "呼气", seconds: 8, scale: 0.8, color: "text-star-orange/80", doneColor: "text-star-orange/60" },
] as const;

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function useBreathingPhase(active: boolean) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [remaining, setRemaining] = useState<number>(PHASES[0].seconds);
  const [completed, setCompleted] = useState<string[]>([]);

  useEffect(() => {
    if (!active) {
      setPhaseIndex(0);
      setCycle(0);
      setRemaining(PHASES[0].seconds);
      setCompleted([]);
      return;
    }
    const timer = setTimeout(() => {
      if (remaining <= 1) {
        const nextIndex = phaseIndex === PHASES.length - 1 ? 0 : phaseIndex + 1;
        if (phaseIndex === PHASES.length - 1) {
          setCycle((c) => c + 1);
          setCompleted([]);
        } else {
          setCompleted((done) => [...done, PHASES[phaseIndex].key]);
        }
        setPhaseIndex(nextIndex);
        setRemaining(PHASES[nextIndex].seconds);
      } else {
        setRemaining((r) => r - 1);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [active, phaseIndex, remaining]);

  return { phase: PHASES[phaseIndex], cycle, remaining, completed };
}

export function BreathingGuide({ active }: { active: boolean }) {
  const { phase, cycle, remaining, completed } = useBreathingPhase(active);
  const progress = (phase.seconds - remaining) / (phase.seconds - 1);

  return (
    <div
      className="flex flex-col items-center gap-3 rounded-2xl border border-star-amber/20 bg-gradient-to-b from-star-gold/10 to-star-amber/10 p-4 text-amber-900/80"
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
            {active &&
              completed.map((key) => {
                const done = PHASES.find((p) => p.key === key)!;
                return (
                  <circle
                    key={`${key}-${cycle}`}
                    cx="56"
                    cy="56"
                    r={RADIUS}
                    fill="none"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    className={done.doneColor}
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={0}
                  />
                );
              })}
            {active && (
              <circle
                key={`${phase.key}-${cycle}`}
                cx="56"
                cy="56"
                r={RADIUS}
                fill="none"
                strokeWidth="2.5"
                strokeLinecap="round"
                stroke="currentColor"
                className={`${phase.color} transition-[stroke-dashoffset] duration-1000 ease-linear`}
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
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
