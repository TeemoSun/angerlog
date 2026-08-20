import { motion } from "framer-motion";

import { intensityColor } from "@/lib/utils";

export const WATER_MAX_COUNT = 30;

export function waterLevelPercent(count: number): number {
  const capped = Math.min(count, WATER_MAX_COUNT);
  return Math.round(15 + (capped / WATER_MAX_COUNT) * 80);
}

const MAX_BALLS = 40;
const COLS = 4;

function ballPosition(index: number): { x: number; y: number; r: number } {
  const row = Math.floor(index / COLS);
  const col = index % COLS;
  const x = 58 + col * 27 + (row % 2) * 13;
  const y = 268 - row * 30;
  return { x, y, r: 10 };
}

export function Bottle({
  logs,
  onOpenForm,
}: {
  logs: { intensity: number }[];
  onOpenForm: () => void;
}) {
  const count = logs.length;
  const percent = waterLevelPercent(count);
  const waterTop = 285 - (percent / 100) * 200;
  const shown = logs.slice(-MAX_BALLS);

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        type="button"
        onClick={onOpenForm}
        className="group relative outline-none"
        aria-label="扔一颗小球"
      >
        <svg
          viewBox="0 0 200 320"
          className="h-[360px] w-[230px] drop-shadow-2xl sm:h-[420px] sm:w-[270px]"
          data-testid="bottle"
        >
          <defs>
            <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0.75" />
            </linearGradient>
            <linearGradient id="glassGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.18" />
            </linearGradient>
            <clipPath id="bottleClip">
              <path d="M85 18 h30 v38 a0 0 0 0 1 0 0 c0 8 8 12 20 14 c26 4 42 18 42 40 v135 c0 22 -18 40 -40 40 h-54 c-22 0 -40 -18 -40 -40 v-135 c0 -22 16 -36 42 -40 c12 -2 20 -6 20 -14 v-38z" />
            </clipPath>
          </defs>

          <path
            d="M85 18 h30 v38 c0 8 8 12 20 14 c26 4 42 18 42 40 v135 c0 22 -18 40 -40 40 h-54 c-22 0 -40 -18 -40 -40 v-135 c0 -22 16 -36 42 -40 c12 -2 20 -6 20 -14 v-38z"
            fill="none"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="4"
          />

          <g clipPath="url(#bottleClip)">
            <motion.rect
              x="42"
              width="116"
              fill="url(#waterGrad)"
              initial={false}
              animate={{ y: waterTop, height: 285 - waterTop }}
              transition={{ type: "spring", stiffness: 60, damping: 16 }}
              data-testid="water"
              data-level={percent}
            />
            {shown.map((log, i) => {
              const { x, y, r } = ballPosition(shown.length - 1 - i);
              return (
                <motion.circle
                  key={shown.length - 1 - i}
                  cx={x}
                  cy={y}
                  r={r}
                  fill={intensityColor(log.intensity)}
                  stroke="rgba(255,255,255,0.6)"
                  strokeWidth="1.5"
                  initial={{ cy: 20, opacity: 0 }}
                  animate={{ cy: y, opacity: 0.9 }}
                  transition={{
                    type: "spring",
                    stiffness: 140,
                    damping: 11,
                    delay: i * 0.06,
                  }}
                  data-testid={`ball-${shown.length - 1 - i}`}
                />
              );
            })}
          </g>

          <rect
            x="44"
            y="75"
            width="112"
            height="212"
            rx="12"
            fill="url(#glassGrad)"
          />

          {count > MAX_BALLS && (
            <text
              x="100"
              y="150"
              textAnchor="middle"
              className="fill-slate-200 text-[14px] font-semibold"
            >
              +{count - MAX_BALLS}
            </text>
          )}
        </svg>

        <span className="pointer-events-none absolute left-1/2 top-[6px] -translate-x-1/2 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-medium text-amber-200 ring-1 ring-amber-300/40 transition group-hover:scale-105 group-hover:bg-amber-400/30">
          🫙 扔小球
        </span>
      </button>

      <p className="text-sm text-slate-400">
        瓶内 <span className="font-semibold text-amber-300">{count}</span> 颗小球 · 水位{" "}
        <span className="font-semibold text-sky-300">{percent}%</span>
      </p>
    </div>
  );
}
